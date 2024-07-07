// bind methods called from HTML to prevent navigation
function bindClick(method, boundArgs) {
    return function(e) {
      e.preventDefault();
      const runtimeArgs = Array.prototype.slice.call(arguments, 1);
      try {
        method.apply(null, runtimeArgs.concat(boundArgs));
      } catch (err) {
        showErrorContent(err);
      }
      return false;
    };
  }
function showErrorContent(error) {
    const containerElem = document.getElementById('error');
    containerElem.style.display = 'block';
    var node = document.createElement('DIV');
    node.innerText = error.message || typeof error === 'string' ? error : showError(error);
    containerElem.appendChild(node);
  }
      
function submitSigninForm() {
    const username = document.querySelector('#signin-form input[name=username]').value;
    const password = document.querySelector('#signin-form input[name=password]').value;
    return renderApp(signIn(username, password));
    }

window._submitSigninForm = bindClick(submitSigninForm);

function renderApp(response) {
    document.getElementById('response').innerText = response;
  }