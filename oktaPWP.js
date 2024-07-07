var trace = false;
var appState = {};
var response = {
  transactionStatus: '',
  content: null  
};
var isPush = false;

//#region	MAIN
const authClient = new OktaAuth({
    issuer: 'https://nevadahhscisext.okta.com/',
    useInteractionCodeFlow: false,
    // tokenManager: {
    //         storage: 'sessionStorage'
    //       }
  });
  
  function signIn(username, password) {
    authClient.signInWithCredentials({username, password})
    .then(handleTransaction)
    .catch(showError);
  }

  function handleTransaction(transaction) {
    switch (transaction.status) {
        case 'SUCCESS':
            updateAppState({ transaction });
            showTraceAppState();
            setResponse(transaction.status, '');
            break;
        case 'MFA_ENROLL':
            updateAppState({ transaction });
            showTraceAppState();
            setResponse(transaction.status, showMfaEnrollFactors());
            break;
        case 'MFA_ENROLL_ACTIVATE':
            updateAppState({ transaction });
            showTraceAppState();
            var factor = transaction.factor;
            setResponse(transaction.status, {factor});
            break;
        case 'MFA_REQUIRED':
            updateAppState({ transaction });
            showTraceAppState();
            var factor = transaction.factors;
            setResponse(transaction.status, {factor});
            break;
      case 'MFA_CHALLENGE':
                                // trace = true;
                                // showTraceAppState();
            if (transaction.factorResult === 'REJECTED') {
              updateAppState({ transaction });
              showTraceTransaction(transaction);
            } 
            else {
              showTraceTransaction({'appState Not Updated': transaction});
            }
            var res={
              expiresAt: transaction.expiresAt,
              factorResult: transaction.factorResult,
              factor: transaction.factor
            };
            setResponse(transaction.status, res);
            break;
        return;
      default:
        throw new Error('TODO: add handling for ' + transaction.status + ' status');
    }
  }

  function updateAppState(props) {
    Object.assign(appState, props);
  }

  //?
  function cancelMfa() {
    return appState.transaction.cancel().finally(appState = {});
    }
  
  function logout() {
    appState = {
      signedOut: true
    };
    const clearTokensBeforeRedirect = false;
    authClient.signOut({ clearTokensBeforeRedirect });
    showTraceAppState();
  }
//#endregion	MAIN

//#region	MFA_ENROLL
  function enrollFactor(index, phoneNumber) {
      const factor = appState.transaction.factors[index];
      if (!factor) {
          console.error('Error: Incorrect factor index selected');
          return;
      }
      updateAppState({ factor });
      
      if (factor.provider === 'OKTA' && factor.factorType === 'sms') {
          return enrollSMS(phoneNumber);
      }

      if ((factor.provider === 'GOOGLE' && factor.factorType === 'token:software:totp') ||
          (factor.provider === 'OKTA' && factor.factorType === 'push') ||
          (factor.provider === 'OKTA' && factor.factorType === 'token:software:totp')) {
              factor.enroll()
                .then(handleTransaction)
                .catch(showError);
          }
      else {
            throw new Error('TODO: add handling for factor - ' + `${factor.provider}:${factor.factorType}`);
          }     
      }

  function enrollSMS(phoneNumber) {
      const factor = appState.factor;
      factor.enroll({
        profile: {
          phoneNumber,
          updatePhone: true
        }
      })
        .then(handleTransaction)
        .catch(showError);
    }
  
  function showMfaEnrollFactors() {
    const transaction = appState.transaction;
    factors = transaction.factors.map(factor => `${factor.provider}:${factor.factorType}`);
    return {factors};
  }
//#endregion MFA_ENROLL

//#region MFA_ENROLL_ACTIVATE
  function activateFactor(passCode) {
    appState.transaction.activate({ passCode })
      .then(handleTransaction)
      .catch(showError);
  }

  function oktaPushPoll() {
    appState.transaction.poll()
      .then(handleTransaction)
      .catch(showError);
  }
//#endregion MFA_ENROLL_ACTIVATE

//#region MFA_REQUIRED
function getFactor()
  {
    isPush = false;
    const cnt = appState.transaction.factors.length;
    if (cnt>1) {
      for (let i = 0; i < cnt; i++) {
        fact = appState.transaction.factors[i];
        if (fact.provider === 'OKTA' && fact.factorType === 'push') {
          isPush = true;
          return fact;
        }
      }
    } 
    else {
      return appState.transaction.factors[0];
    }
  }

function challengeFactor() {
  const factor = getFactor();
  var autoPushFlag = null;
  if (isPush) {
    autoPushFlag = { autoPush: true };
  }
  factor.verify({ autoPush: true })
      .then(handleTransaction)
      .catch(showError);
}

function verifyFactor(passCode) {
  const factor = getFactor();
  if (isPush) {
    factor.verify({ autoPush: true })
      .then(tran => {
              tran.poll({ autoPush: true })
                .then(handleTransaction)
                .catch(showError);
            })
      .catch(showError);
  }
  else {
    factor.verify({ passCode })
      .then(handleTransaction)
      .catch(showError);
  }
}

// Okta PUSH- If Challenge is Rejected, prev() will set the transaction to MFA_REQUIRED
function prevMfa() {
  return appState.transaction.prev()
    .then(handleTransaction)
    .catch(showError);
  }
//#endregion MFA_REQUIRED

//#region COMMON FUNCTIONS
  function showTraceAppState() {
    if (trace)
      console.log('AppState: '+ stringify(appState));
  }

  function showTraceTransaction(tran) {
    if (trace)
      console.log('Transaction: '+ stringify(tran));
  }

  function setResponse(status, content) {
    response = {
        transactionStatus: status,
        content: content
    };
    var retRes = stringify(response);
    console.log('Response: ' + retRes);
    renderApp(retRes);
  }
  
  function showError(errorMsg) {
    if (trace)
        console.log('Trace-Error: '+ stringify(errorMsg));
    
    var error = {
        errorSummary : errorMsg.errorSummary,
        errorCauses : errorMsg.errorCauses
    };
    console.error('Error: ' + stringify(error) );
    }

  function stringify(obj) {
    // Convert false/undefined/null into "null"
    if (!obj) {
      return 'null';
    }
    return JSON.stringify(obj, null, 2);
  }
//#endregion COMMON FUNCTIONS
