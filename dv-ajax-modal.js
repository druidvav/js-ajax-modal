class DvAjaxModal {
    constructor(bootstrapVersion) {
        this.modalEl = null;
        this.contentEl = null;
        this.events = { };
        this.version = bootstrapVersion;
        this.modal = null;
    }
    init() {
        document.body.insertAdjacentHTML('beforeend', this.getModalHtml());
        this.modalEl = document.getElementById('modal-window');
        this.contentEl = this.modalEl.querySelector('.modal-content');
        if (this.version >= 4) {
            this.modal = new Modal(this.modalEl);
        }
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
        })
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
        let parameters = [...(new FormData(form)).entries()].map(e => encodeURIComponent(e[0]) + "=" + encodeURIComponent(e[1])).join('&');
        this.contentEl.innerHTML = this.getSpinnerHtml();
        await this.request(e.target['action'], parameters);
    }
    async request(url, params) {
        try {
            let response = params === undefined ? await DvAjaxRequest.get(url) : await DvAjaxRequest.post(url, params);
            if (!response || !response.result) {
                this.events['error']({ message: 'Invalid response' });
            } else if (this.events[response.result]) {
                this.events[response.result](response);
            } else {
                console.log(response);
            }
        } catch (err) {
            this.events['error']({ message: err.message });
        }
    }
    show() {
        return new Promise((resolve => {
            if (this.version >= 4) {
                this.modalEl.addEventListener('shown.bs.modal', () => { resolve() }, { once: true });
                this.modal.show();
            } else {
                $(this.modalEl).one('shown.bs.modal', () => { resolve() }).modal('show');
            }
        }))
    }
    hide() {
        if (this.version >= 4) {
            this.modal.hide();
        } else {
            $(this.modalEl).modal('hide');
        }
    }
    getModalHtml() {
        return '<div id="modal-window" class="modal fade"><div class="modal-dialog"><div class="modal-content"></div></div></div>';
    }
    getSpinnerHtml() {
        return '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-4x fa-pulse"></i></div>';
    }
    getErrorHtml(message) {
        return '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
            '<h4 class="modal-title">Error</h4></div><div class="modal-body">' + message + '</div>';
    }
}