class DvModal {
    constructor() {
        this.modalEl = null;
        this.contentEl = null;
        this.events = { };
        this.modalBs = null;
    }
    init() {
        document.body.insertAdjacentHTML('beforeend', this.getModalHtml());
        let text = document.createTextNode(this.getSpinnerCss());
        let style = document.createElement('style');
        document.head.appendChild(style);
        style.appendChild(text);
        this.modalEl = document.getElementById('modal-window');
        this.contentEl = this.modalEl.querySelector('.modal-content');
        this.modalBs = new bootstrap.Modal(this.modalEl);
        this.on('redirect', (response) => { location.href = response.url; });
        this.on('refresh', () => { location.href = location.href.replace(/#.+$/, ''); });
        this.on('html', (response) => {
            this.contentEl.innerHTML = response['html'];
            Array.from(this.contentEl.querySelectorAll("script")).forEach(oldScript => {
                const newScript = document.createElement("script");
                Array.from(oldScript.attributes).forEach( attr => newScript.setAttribute(attr.name, attr.value) );
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
            Array.from(this.contentEl.querySelectorAll('[data-bs-dismiss="modal"]')).forEach(button => {
                button.type = 'button';
            });
            this.modalEl.querySelector('.modal-dialog').className = 'modal-dialog ' + (response['modal-size'] ?? '');
            let focusField = this.contentEl.querySelector('.form-focus');
            if (focusField) focusField.focus();
            let form = this.contentEl.querySelector('form');
            if (form) form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.onFormSubmit(form, e).then(() => {});
            });
        });
        this.on('error', (response) => {
            this.contentEl.innerHTML = this.getErrorHtml(response['message'] ?? response['error']);
        });
        this.#handleDataSelector();
    }
    #handleDataSelector() {
        document.querySelector('body').addEventListener("click", (e) => {
            let target = null;
            if (!e.target) return;
            target = e.target.matches('[data-dv-toggle="modal"]') ? e.target : e.target.closest('[data-dv-toggle="modal"]');
            if (!target) return;
            e.preventDefault();
            bootstrap.Tooltip.getInstance(target)?.hide();
            this.onClick(target).then();
        });
    }
    on(event, action) {
        this.events[event] = action;
    }
    async onClick(el) {
        let confirmText = el.dataset.confirm;
        if (!confirmText || confirm(confirmText)) {
            this.contentEl.innerHTML = this.getSpinnerHtml();
            await this.show();
            await this.request(el.dataset.url);
        }
    }
    async onFormSubmit(form, e) {
        // noinspection JSCheckFunctionSignatures
        this.contentEl.innerHTML = this.getSpinnerHtml();
        await this.request(e.target['action'], new FormData(form));
    }
    async request(url, params) {
        try {
            const fetchResponse = await fetch(url, {
                method: params === undefined ? "GET" : "POST",
                body: params,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (fetchResponse.status === 413) {
                this.events['error']({
                    message: 'Request too large. Are you trying to upload very large file?'
                });
            } else if (fetchResponse.status > 400) {
                this.events['error']({
                    message: fetchResponse.status.toString() + ' ' + fetchResponse.statusText
                });
            } else {
                const response = await fetchResponse.json();
                if (!response || !response.result) {
                    this.events['error']({ message: 'Invalid response' });
                } else if (this.events[response.result]) {
                    this.events[response.result](response);
                } else {
                    console.log(response);
                }
            }
        } catch (err) {
            this.events['error']({ message: err.message });
        }
    }
    show() {
        return new Promise((resolve => {
            this.modalEl.addEventListener('shown.bs.modal', () => { resolve() }, { once: true });
            this.modalBs.show();
        }))
    }
    hide() {
        this.modalBs.hide();
    }
    getModalHtml() {
        return '<div id="modal-window" class="modal fade"><div class="modal-dialog"><div class="modal-content"></div></div></div>';
    }
    getSpinnerCss() {
        return '.lds-default {display: inline-block;position: relative;width: 80px;height: 80px;}.lds-default div {position: absolute;width: 6px;height: 6px;background: black;border-radius: 50%;animation: lds-default 1.2s linear infinite;}.lds-default div:nth-child(1) {animation-delay: 0s;top: 37px;left: 66px;}.lds-default div:nth-child(2) {animation-delay: -0.1s;top: 22px;left: 62px;}.lds-default div:nth-child(3) {animation-delay: -0.2s;top: 11px;left: 52px;}.lds-default div:nth-child(4) {animation-delay: -0.3s;top: 7px;left: 37px;}.lds-default div:nth-child(5) {animation-delay: -0.4s;top: 11px;left: 22px;}.lds-default div:nth-child(6) {animation-delay: -0.5s;top: 22px;left: 11px;}.lds-default div:nth-child(7) {animation-delay: -0.6s;top: 37px;left: 7px;}.lds-default div:nth-child(8) {animation-delay: -0.7s;top: 52px;left: 11px;}.lds-default div:nth-child(9) {animation-delay: -0.8s;top: 62px;left: 22px;}.lds-default div:nth-child(10) {animation-delay: -0.9s;top: 66px;left: 37px;}.lds-default div:nth-child(11) {animation-delay: -1s;top: 62px;left: 52px;}.lds-default div:nth-child(12) {animation-delay: -1.1s;top: 52px;left: 62px;}@keyframes lds-default {0%, 20%, 80%, 100% {transform: scale(1);}  50% {transform: scale(1.5);}}';
    }
    getSpinnerHtml() {
        return '<div style="text-align: center; padding: 20px;"><div class="lds-default"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div>';
    }
    getErrorHtml(message) {
        return '<div class="modal-header"><h4 class="modal-title">Error</h4><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body">' + message + '</div>';
    }
}
