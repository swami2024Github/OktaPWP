//#region COMMON 1
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
        break;
      case 'MFA_ENROLL':
        showMfaEnrollFactors();
        return;
      case 'MFA_REQUIRED':
      case 'MFA_ENROLL_ACTIVATE':
      case 'MFA_CHALLENGE':
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

// Show / Hide MFA panel
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

function hideMfa() {
  document.getElementById('signin-form').style.display = 'block';
  document.getElementById('mfa').style.display = 'none';
  document.querySelector('#mfa .header').innerHTML = '';
  hideMfaEnroll();
}

// Show a list of MFA factors. The user can pick a factor to enroll in.
function hideMfaEnroll() {
  document.getElementById('mfa-enroll').style.display = 'none';
  hideMfaEnrollFactors();
}

function showMfaEnroll() {
  document.getElementById('mfa-enroll').style.display = 'block';
  showCancelMfa();
  document.querySelector('#mfa .header').innerText = 'Enroll in an MFA factor';
}

function showMfaEnrollFactors() {
  showMfaEnroll();
  const containerElement = document.getElementById('mfa-enroll-factors');
  containerElement.style.display = 'block';
  const names = getMfaEnrollFactors();
  names.factors.forEach(function(name, index) {
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

function selectMfaFactorForEnrollment() {
}
window._selectMfaFactorForEnrollment = bindClick(selectMfaFactorForEnrollment);

function hideMfaEnrollFactors() {
  const containerElement = document.getElementById('mfa-enroll-factors');
  containerElement.style.display = 'none';
  containerElement.innerHTML = '';
}

// cancel - terminates the auth flow.
function showCancelMfa() {
  document.getElementById('mfa-cancel').style.display = 'inline';
}
function hideCancelMfa() {
  document.getElementById('mfa-cancel').style.display = 'none';
}

function cancelMfaEvent() {
  hideMfa();
  cancelMfa();
  clearUi();
}

window._cancelMfa = bindClick(cancelMfaEvent);