var selectedIndex = -1;
var factorsNames = '';
showSignIn();

//#region COMMON
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

function renderApp() {
    const containerElem = document.getElementById('response');
    var col = response.isSuccess ? 'green' : 'red' ;
    containerElem.style.color = col;
    containerElem.innerText =stringify(response);
    
    if (response.transactionStatus !== '') {
      hideSignIn();
    }

    switch (response.transactionStatus) {
      case 'SUCCESS':
        hideMfa();
        break;
      case 'MFA_ENROLL':
        showMfaEnrollFactors();
        return;
      case 'MFA_REQUIRED':
        break;
      case 'MFA_ENROLL_ACTIVATE':
        hideMfaEnroll();
        showMfaEnroll();
        showMfaEnrollActivate();
        return;
      case 'MFA_CHALLENGE':
        //Not implemented;
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

  //#region MFA Enroll
  function hideMfa() {
    document.getElementById('mfa').style.display = 'none';
    document.querySelector('#mfa .header').innerHTML = '';
    hideSubmitMfa();
    hideMfaEnroll();
    hideMfaEnrollActivate();
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
    containerElement.innerHTML = '';
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

  function selectMfaFactorForEnrollment(index) {
    selectedIndex = index;
    hideMfaEnrollFactors();
    if (isOktaSMS()) {
      showEnrollPhone();
    }
    else {
      enrollFactor(index).then(renderApp).catch(renderApp);
    }
  }
  window._selectMfaFactorForEnrollment = bindClick(selectMfaFactorForEnrollment);
  
  function enrollPhone() {
    const phoneNumber = document.querySelector('#mfa-enroll-phone input[name=phone]').value;
    enrollFactor(selectedIndex, phoneNumber).then(renderApp).catch(renderApp);
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

  function isOktaSMS(){
    const factor = factorsNames[selectedIndex];
    return factor === 'OKTA:sms';
  }

  function isOktaPush(){
    const factor = factorsNames[selectedIndex];
    return factor === 'OKTA:push';
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
    document.querySelector('#mfa .header').innerText = 'SMS';
    document.getElementById('mfa-enroll-activate-phone').style.display = 'block';
  }

  function submitEnrollActivate() {
    var passCode = '';
    if (isOktaSMS()) {
      passCode = document.querySelector('#mfa-enroll-activate-phone input[name=passcode]').value;
    } 
    else {
      passCode = document.querySelector('#mfa-enroll-activate-app input[name=passcode]').value;
    }
    activateFactor(passCode).then(renderApp);
  }

  function hideActivateOktaVerify() {
    document.getElementById('mfa-enroll-activate-app').style.display = 'none';
  }

  function showActivateOktaVerify() {
    showSubmitMfa();
    document.querySelector('#mfa .header').innerText = factorsNames[selectedIndex];
    const qrcode = response.content.factor.activation.qrcode;
    const containerElem = document.getElementById('mfa-enroll-activate-app');
    containerElem.style.display = 'block';
    const imgFrame = document.querySelector('#mfa-enroll-activate-app .qrcode');
    imgFrame.innerHTML = '';
    const img = document.createElement('img');
    img.setAttribute('src', qrcode.href);
    imgFrame.appendChild(img);
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
    if (isOktaSMS() && response.transactionStatus === 'MFA_ENROLL') {
      renderApp();
    } 
    else {
      prevMfa().then(renderApp).catch(renderApp);
    }
  }
  window._prevMfaUi = bindClick(prevMfaUi);

  function showSubmitMfa() {
    document.getElementById('mfa-submit').style.display = 'inline';
  }

  function hideSubmitMfa() {
    document.getElementById('mfa-submit').style.display = 'none';
  }
  function submitMfa() {
    if (response.transactionStatus === 'MFA_ENROLL') {
      showActivatePhone();
      enrollPhone();
    }
    if (response.transactionStatus === 'MFA_ENROLL_ACTIVATE') {
      submitEnrollActivate();
    }
    }
  window._submitMfa = bindClick(submitMfa);
  //#endregion MFA Button Events

//#endregion MFA panel