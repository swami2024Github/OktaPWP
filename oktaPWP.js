var trace = false;
var appState = {};
var response = {
  isSuccess : false,
  transactionStatus: '',
  content: null
};

//#region	MAIN
const authClient = new OktaAuth({
    issuer: 'https://nevadahhscisext.okta.com/',
    useInteractionCodeFlow: false,
    // tokenManager: {
    //         storage: 'sessionStorage'
    //       }
  });
  
  function signIn(username, password) {
    return authClient.signInWithCredentials({username, password})
    .then(handleTransaction)
    .catch(showError);
  }

  function handleTransaction(transaction) {
    response = '';
    switch (transaction.status) {
        case 'SUCCESS':
            updateAppState({ transaction });
            showTraceAppState();
            setResponse(transaction.status, '');
            break;
        case 'MFA_ENROLL':
            updateAppState({ transaction });
            showTraceAppState();
            setResponse(transaction.status, getMfaEnrollFactors());
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

  function cancelMfa() {
    return appState.transaction.cancel().finally(clear);
    }
  
  function clear() {
    appState = {};
    response = {};
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
      return returnRejectPromice('Error: Incorrect factor index selected');
    } 
    else {
      updateAppState({ factor });
      
      if (factor.provider === 'OKTA' && factor.factorType === 'sms') {
        return factor.enroll({
          profile: {
            phoneNumber: phoneNumber,
            updatePhone: true
          }
        }).then(handleTransaction)
          .catch(showError);
      } 
      else if ((factor.provider === 'GOOGLE' && factor.factorType === 'token:software:totp') ||
          (factor.provider === 'OKTA' && factor.factorType === 'token:software:totp')) {
            return factor.enroll()
              .then(handleTransaction)
              .catch(showError);
          }
      else {
        return returnRejectPromice('No handling for factor - ' + `${factor.provider}:${factor.factorType}`);
        }
    }
    }
  
  function getMfaEnrollFactors() {
    const transaction = appState.transaction;
    factors = transaction.factors.map(factor => `${factor.provider}:${factor.factorType}`);
    return {factors};
  }
//#endregion MFA_ENROLL

//#region MFA_ENROLL_ACTIVATE
  function activateFactor(passCode) {
    return appState.transaction.activate({ passCode })
      .then(handleTransaction)
      .catch(showError);
  }
//#endregion MFA_ENROLL_ACTIVATE

//#region MFA_REQUIRED
function getFactor() {
  return appState.transaction.factors[0];
}

function challengeFactor() {
  const factor = getFactor();
  return factor.verify()
      .then(handleTransaction)
      .catch(showError);
}

function verifyFactor(passCode) {
  const factor = getFactor();
  return factor.verify({ passCode })
      .then(handleTransaction)
      .catch(showError);
}

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
        isSuccess : true,
        transactionStatus: status,
        content: content
    };
    console.log('Response: ' + stringify(response));
    return response;
  }
  
  function returnRejectPromice(msg) {
    return new Promise((resolve, reject) => {
      reject(showError(msg));
    });
  }

  function showError(errorMsg) {
    if (trace)
      console.error(errorMsg);

    var error = '';
    if (!errorMsg.errorSummary){
      error = errorMsg;
    } 
    else {
      error = {
        errorSummary : errorMsg.errorSummary,
        errorCauses : errorMsg.errorCauses 
      };
    }
    response = {
      isSuccess : false,
      transactionStatus : response.transactionStatus,
      content : error
    };
    return response;
  }

  function stringify(obj) {
    // Convert false/undefined/null into "null"
    if (!obj) {
      return 'null';
    }
    return JSON.stringify(obj, null, 2);
  }
//#endregion COMMON FUNCTIONS
