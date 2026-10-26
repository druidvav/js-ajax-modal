# @druidvav/modal

AJAX modal windows for Bootstrap 5. Content comes from the server as JSON, forms inside the modal are submitted via `fetch`.

## Installation

```bash
yarn add @druidvav/modal
```

The library is a single file without a build step: include `node_modules/@druidvav/modal/modal.js` into your bundle after Bootstrap. It defines the global class `DvModal` and requires `bootstrap.Modal`.

## Usage

```js
document.addEventListener('DOMContentLoaded', () => {
    const modal = new DvModal();
    modal.init();
});
```

```html
<button type="button" data-dv-toggle="modal" data-url="/orders/12/edit">Edit</button>

<a href="/orders/12/delete" data-dv-toggle="modal" data-url="/orders/12/delete"
   data-confirm="Delete order 12?" data-confirm-button="Delete">Delete</a>
```

A click on an element with `data-dv-toggle="modal"` opens the modal and requests `data-url`. If the element has `data-confirm`, a confirmation is shown in the modal first; the request is sent only after the user confirms. `data-confirm-button` sets the confirm button label.

A page form with `data-dv-toggle="modal"` is submitted to the modal: its data is sent with POST to `action`, and the response opens in the modal.

```html
<form method="post" action="/orders/12/cancel" data-dv-toggle="modal" data-confirm="Cancel order 12?">
    <button type="submit">Cancel order</button>
</form>
```

## Confirmations for regular forms

`data-confirm` also works on any page form and on its submit buttons. On the form it asks before every submit, on a button only when that button is pressed. After confirmation the form is submitted as usual, with the pressed button.

```html
<form method="post" action="/tasks/5">
    <button type="submit" name="action" value="save">Save</button>
    <button type="submit" name="action" value="finish" data-confirm="Finish the task?" data-confirm-button="Finish">Finish</button>
</form>
```

## Double submit protection

```html
<form method="post" action="/orders" data-prevent-double-submit>
```

Ignores repeated submits of the form while the browser is loading the result. Buttons are not disabled, so the pressed button is still sent with the form. The protection is reset when the page is restored from the browser cache. Do not use it on forms that download a file or open the result in another window: the page stays, and the form cannot be submitted again until reload.

## Server responses

The server responds with JSON, the `result` field selects the handler:

| `result`   | Action                                                                 |
|------------|------------------------------------------------------------------------|
| `html`     | Puts `html` into `.modal-content`. Optional `modal-size`: `modal-lg`, `modal-xl`, etc. |
| `redirect` | Navigates to `url`.                                                    |
| `refresh`  | Reloads the current page.                                              |
| `error`    | Shows `message` (or `error`) in an error modal.                        |

`html` should contain the full modal markup: `.modal-header`, `.modal-body`, `.modal-footer`. Scripts in it are executed. A form inside it is submitted with `fetch` (POST, `FormData`) to its `action`, and the response is handled the same way, so validation errors can be returned as `html` again. An element with the `form-focus` class gets focus.

Requests carry the `X-Requested-With: XMLHttpRequest` header. The name and value of the submit button that was pressed are added to the form data.

## Errors

Network errors, HTTP errors (413 and above 400) and responses that are not valid JSON are handled without losing user input:

- a form submitted from the modal is restored with everything the user has entered, and the error is shown above it as `.alert.alert-danger[data-dv-error]`; the user can submit the form again;
- a modal opened by a click shows an error with a «Retry» button that repeats the request. POST requests, such as a page form submitted to the modal, show the error without «Retry»: the server may have already performed the action. Add `data-retry-post` to the form or the element that opens the modal if repeating its request is safe.

A `result: error` response from the server is shown by the `error` handler as before.

## API

```js
modal.on('result-name', response => { ... }); // add or override a response handler
await modal.confirm('Text', { title, button }); // show a confirmation, resolves to true / false
await modal.loading();               // open the modal with a spinner
await modal.load(url, formData, options); // loading() + request()
await modal.show();
modal.hide();
await modal.request(url);           // GET
await modal.request(url, formData); // POST
await modal.request(url, formData, { retryPost: true });          // show «Retry» for this POST request
await modal.request(url, formData, { onFail: message => { ... } }); // custom handling of transport errors
```

## Localization

Built-in languages: `en`, `ru`, `hy`, `cn`. By default the language is taken from `<html lang>` (`zh` maps to `cn`), otherwise `en` is used.

```js
new DvModal({ locale: 'ru' });
new DvModal({ messages: { confirmButton: 'Yes' } }); // override separate messages
```

Message keys: `confirmTitle`, `confirmButton`, `cancel`, `close`, `errorTitle`, `requestTooLarge`, `serverError` (`{status}` is replaced with the HTTP status), `invalidResponse`, `networkError`, `retry`.

## Changes in 1.0

- `data-confirm` shows a Bootstrap modal instead of the browser `confirm()` and works on regular forms and submit buttons.
- Page forms with `data-dv-toggle="modal"` are submitted to the modal.
- Double submit protection for forms with `data-prevent-double-submit`.
- New methods `loading()` and `load()`. `getSpinnerHtml()`, `getErrorHtml()`, `getModalHtml()` and other markup helpers are now private.
- Interface messages are localized.
- Transport errors keep the form with the user input or offer to retry the request.
- The pressed submit button is sent with the form.
