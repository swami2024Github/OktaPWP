var selectedIndex = -1;
var factorsNames = '';

//#region COMMON
// bind methods called from HTML to prevent navigation
function bindClick(method, boundArgs) {
    return function(e) {
      e.preventDefault();
      const runtimeArgs = Array.prototype.slice.call(arguments, 1);
      try {
        method.apply(null, runtimeArgs.concat(boundArgs));
      } catch (err) {
        throw new Error(err);
      }
      return false;
    };
  }

showSignIn();
function renderApp() {
    const containerElem = document.getElementById('response');
    var col = response.isSuccess ? 'green' : 'red' ;
    containerElem.style.color = col;
    containerElem.innerText =stringify(response);
    //alert (stringify(response));

    if (response.transactionStatus !== '') {
      hideSignIn();
    } 
  
    switch (response.transactionStatus) {
      case 'SUCCESS':
        break;
      case 'MFA_ENROLL':
        showMfaEnrollFactors();
        return;
      case 'MFA_REQUIRED':
        break;
      case 'MFA_ENROLL_ACTIVATE':
        showMfaEnrollActivate();
        return;
      case 'MFA_CHALLENGE':
        
        //showMfaAuthn();
        return;
      default:
        showSignIn();
        break;
    }
}

function clearUi() {
  const containerElem = document.getElementById('response');
  containerElem.innerText ='';
}
//#endregion COMMON

//#region SignIn
function showSignIn() {
  document.getElementById('signin-form').style.display = 'block';
  document.getElementById('mfa').style.display = 'none';
}

function hideSignIn() {
  document.getElementById('signin-form').style.display = 'none';
  document.getElementById('mfa').style.display = 'block';
}

function submitSigninForm() {
    const username = document.querySelector('#signin-form input[name=username]').value;
    const password = document.querySelector('#signin-form input[name=password]').value;
    signIn(username, password).then(renderApp);
    }
window._submitSigninForm = bindClick(submitSigninForm);
//#endregion SignIn

//#region MFA panel
function showMfaAuthn() {
  document.getElementById('mfa').style.display = 'block';
  const transactionStatus = response.transactionStatus;
  if (transactionStatus === 'MFA_ENROLL') {
    return showMfaEnrollFactors();
  }
  if (transactionStatus === 'MFA_ENROLL_ACTIVATE') {
    return showMfaEnrollActivate();
  }
  if (transactionStatus === 'MFA_REQUIRED') {
    return showMfaRequired();
  }
  if (transactionStatus === 'MFA_CHALLENGE') {
    return showMfaChallenge();
  }
  throw new Error(`TODO: showMfaAuthn: handle transaction status ${transactionStatus}`);
}

  //#region MFA Enroll
  function hideMfa() {
    document.getElementById('mfa').style.display = 'none';
    document.querySelector('#mfa .header').innerHTML = '';
    hideSubmitMfa();
    hideMfaEnroll();
    hideMfaEnrollActivate();
    //hideMfaRequired();
    //hideMfaChallenge();
    //hideAuthenticatorVerificationData();
  }

  function hideMfaEnroll() {
    document.getElementById('mfa-enroll').style.display = 'none';
    hideMfaEnrollFactors();
    hideEnrollPhone();
  }

  function showMfaEnroll() {
    document.getElementById('mfa-enroll').style.display = 'block';
    showCancelMfa();
    document.querySelector('#mfa .header').innerText = 'Enroll in an MFA factor';
  }

  function hideMfaEnrollFactors() {
    const containerElement = document.getElementById('mfa-enroll-factors');
    containerElement.style.display = 'none';
    containerElement.innerHTML = '';
  }

  function showMfaEnrollFactors() {
    selectedIndex = -1;
    showMfaEnroll();
    const containerElement = document.getElementById('mfa-enroll-factors');
    containerElement.style.display = 'block';
    factorsNames = getMfaEnrollFactors().factors;
    factorsNames.forEach(function(name, index) {
      const el = document.createElement('div');
      el.setAttribute('id', `enroll-factor-${index}`);
      el.setAttribute('class', `factor panel`);
      el.innerHTML = `
        <span>${name}</span>
        <a href="#" onclick="_selectMfaFactorForEnrollment(event, ${index})">Enroll</a>
      `;    
      containerElement.appendChild(el);
    });
  }

  function hideEnrollPhone() {
    document.getElementById('mfa-enroll-phone').style.display = 'none';
  }

  function showEnrollPhone() {
    showPrevMfa();
    showSubmitMfa();
    document.querySelector('#mfa .header').innerText = 'Phone/SMS';
    document.getElementById('mfa-enroll-phone').style.display = 'block';
  }

  function selectMfaFactorForEnrollment(index) {
    selectedIndex = index;
    hideMfaEnrollFactors();
    if (isOktaSMS()) {
      showEnrollPhone();
    }
    else {
      enrollFactor(index).then(renderApp);
    }
  }
  window._selectMfaFactorForEnrollment = bindClick(selectMfaFactorForEnrollment);
  
  function isOktaSMS(){
    const factor = factorsNames[selectedIndex];
    return factor === 'OKTA:sms';
  }
  

  //#endregion MFA Enroll

  //#region MFA Activate
  function showMfaEnrollActivate() {
    document.getElementById('mfa-enroll-activate').style.display = 'block';
    document.querySelector('#mfa .header').innerText = 'Activate an MFA factor';
    showPrevMfa();
    if (isOktaSMS()) {
      return showActivatePhone();
    } 
    else {
      return showActivateOktaVerify();
    }
  }

  function hideMfaEnrollActivate() {
    document.getElementById('mfa-enroll-activate').style.display = 'none';
    hideActivateOktaVerify();
    hideActivatePhone();
  }

  function hideActivatePhone() {
    document.getElementById('mfa-enroll-activate-phone').style.display = 'none';
  }

  function showActivatePhone() {
    showSubmitMfa();
    document.querySelector('#mfa .header').innerText = 'Phone/SMS';
    document.getElementById('mfa-enroll-activate-phone').style.display = 'block';
  }

  function submitEnrollActivate() {
    const factor = appState.transaction.factor;

    if (factor.provider === 'OKTA' && factor.factorType === 'token:software:totp') {
      return submitActivateOktaVerify();
    }

    if (factor.provider === 'OKTA' && (factor.factorType === 'sms' || factor.factorType === 'call')) {
      return submitActivatePhone();
    }

    throw new Error(`TODO: handle submit enroll activate for factorType ${factor.factorType}`);
  }

  function hideActivateOktaVerify() {
    document.getElementById('mfa-enroll-activate-okta-verify').style.display = 'none';
  }

  function showActivateOktaVerify() {
    showSubmitMfa();
    document.querySelector('#mfa .header').innerText = factorsNames[selectedIndex];
    const qrcode = response.content.factor.activation.qrcode;
    const containerElem = document.getElementById('mfa-enroll-activate-okta-verify');
    containerElem.style.display = 'block';
    const imgFrame = document.querySelector('#mfa-enroll-activate-okta-verify .qrcode');
    imgFrame.innerHTML = '';
    const img = document.createElement('img');
    img.setAttribute('src', qrcode.href);
    imgFrame.appendChild(img);
  }

  function submitActivateOktaVerify() {
    hideMfa();
    const passCode = document.querySelector('#mfa-enroll-activate-okta-verify input[name=passcode]').value;
    appState.transaction.activate({ passCode })
      .then(handleTransaction)
      .catch(showError);
  }
  //#endregion MFA Activate

  //#region MFA Button Events
function showCancelMfa() {
  document.getElementById('mfa-cancel').style.display = 'inline';
  hidePrevMfa();
}
function hideCancelMfa() {
  document.getElementById('mfa-cancel').style.display = 'none';
}

function cancelMfaEvent() {
  showSignIn();
  hideMfa();
  clearUi();
  cancelMfa();
}
window._cancelMfa = bindClick(cancelMfaEvent);

function showPrevMfa() {
  document.getElementById('mfa-prev').style.display = 'inline';
  hideCancelMfa();
}
function hidePrevMfa() {
  document.getElementById('mfa-prev').style.display = 'none';
}
function prevMfaUi() {
  hideMfa();
  if (isOktaSMS()) {
    renderApp();
  } 
  else {
    prevMfa().then(renderApp);
  }
}
window._prevMfaUi = bindClick(prevMfaUi);

function showSubmitMfa() {
  document.getElementById('mfa-submit').style.display = 'inline';
}
function hideSubmitMfa() {
  document.getElementById('mfa-submit').style.display = 'none';
}
//#endregion MFA Button Events

//#endregion MFA panel