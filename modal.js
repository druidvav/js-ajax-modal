class DvModal {
    static messages = {
        en: {
            confirmTitle: 'Confirmation',
            confirmButton: 'OK',
            cancel: 'Cancel',
            close: 'Close',
            errorTitle: 'Error',
            requestTooLarge: 'Request too large. The file you are uploading may be too big.',
            invalidResponse: 'Invalid server response. Your session may have expired: reload the page.',
            networkError: 'Could not reach the server. Check your connection and try again.',
            serverError: 'Server error ({status}). Try again later.',
            retry: 'Retry',
        },
        ru: {
            confirmTitle: 'Подтверждение',
            confirmButton: 'Подтвердить',
            cancel: 'Отмена',
            close: 'Закрыть',
            errorTitle: 'Ошибка',
            requestTooLarge: 'Слишком большой запрос. Возможно, загружаемый файл слишком велик.',
            invalidResponse: 'Некорректный ответ сервера. Возможно, сессия истекла: обновите страницу.',
            networkError: 'Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.',
            serverError: 'Ошибка сервера ({status}). Попробуйте ещё раз позже.',
            retry: 'Повторить',
        },
        hy: {
            confirmTitle: 'Հաստատում',
            confirmButton: 'Հաստատել',
            cancel: 'Չեղարկել',
            close: 'Փակել',
            errorTitle: 'Սխալ',
            requestTooLarge: 'Հարցումը չափազանց մեծ է։ Հնարավոր է՝ վերբեռնվող ֆայլը չափազանց մեծ է։',
            invalidResponse: 'Սերվերի սխալ պատասխան։ Հնարավոր է՝ սեսիան ավարտվել է. թարմացրեք էջը։',
            networkError: 'Չհաջողվեց կապվել սերվերի հետ։ Ստուգեք կապը և կրկին փորձեք։',
            serverError: 'Սերվերի սխալ ({status})։ Կրկին փորձեք ավելի ուշ։',
            retry: 'Կրկնել',
        },
        cn: {
            confirmTitle: '确认',
            confirmButton: '确定',
            cancel: '取消',
            close: '关闭',
            errorTitle: '错误',
            requestTooLarge: '请求过大，上传的文件可能太大。',
            invalidResponse: '服务器响应无效，会话可能已过期，请刷新页面。',
            networkError: '无法连接服务器，请检查网络后重试。',
            serverError: '服务器错误（{status}），请稍后重试。',
            retry: '重试',
        },
    };
    constructor(options = {}) {
        this.modalEl = null;
        this.contentEl = null;
        this.events = { };
        this.modalBs = null;
        this.submittingForms = new WeakSet();
        this.locale = DvModal.#resolveLocale(options.locale ?? document.documentElement.lang);
        this.messages = { ...DvModal.messages.en, ...DvModal.messages[this.locale], ...options.messages };
    }
    static #resolveLocale(lang) {
        const code = (lang || '').toLowerCase().split(/[-_]/)[0];
        if (code === 'zh') return 'cn';
        return DvModal.messages[code] ? code : 'en';
    }
    init() {
        document.body.insertAdjacentHTML('beforeend', this.#getModalHtml());
        let text = document.createTextNode(this.#getSpinnerCss());
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
            this.contentEl.innerHTML = this.#getErrorHtml(response['message'] ?? response['error']);
        });
        this.#handleDataSelector();
    }
    #handleDataSelector() {
        document.querySelector('body').addEventListener("click", (e) => {
            let target = null;
            if (!e.target) return;
            target = e.target.matches('[data-dv-toggle="modal"]') ? e.target : e.target.closest('[data-dv-toggle="modal"]');
            if (!target || target instanceof HTMLFormElement) return;
            e.preventDefault();
            bootstrap.Tooltip.getInstance(target)?.hide();
            this.onClick(target).then();
        });
        const confirmed = new WeakSet();
        document.querySelector('body').addEventListener('submit', (e) => {
            const form = e.target;
            if (!(form instanceof HTMLFormElement) || this.contentEl.contains(form)) return;
            const confirmEl = [e.submitter, form].find(el => el?.dataset.confirm);
            if (form.matches('[data-dv-toggle="modal"]')) {
                e.preventDefault();
                this.onPageFormSubmit(form, e, confirmEl).then();
            } else if (confirmEl && !confirmed.has(form)) {
                e.preventDefault();
                this.confirm(confirmEl.dataset.confirm, { button: confirmEl.dataset.confirmButton }).then((ok) => {
                    if (!ok) return;
                    this.hide();
                    confirmed.add(form);
                    form.requestSubmit(e.submitter);
                });
            } else {
                confirmed.delete(form);
                if ('preventDoubleSubmit' in form.dataset) this.#guardDoubleSubmit(form, e);
            }
        });
        addEventListener('pageshow', () => { this.submittingForms = new WeakSet(); });
    }
    #guardDoubleSubmit(form, e) {
        if (this.submittingForms.has(form)) {
            e.preventDefault();
            return;
        }
        setTimeout(() => { if (!e.defaultPrevented) this.submittingForms.add(form); });
    }
    on(event, action) {
        this.events[event] = action;
    }
    async onClick(el) {
        if (el.dataset.confirm && !await this.confirm(el.dataset.confirm, { button: el.dataset.confirmButton })) return;
        await this.load(el.dataset.url, undefined, { retryPost: 'retryPost' in el.dataset });
    }
    async onPageFormSubmit(form, e, confirmEl) {
        if (confirmEl && !await this.confirm(confirmEl.dataset.confirm, { button: confirmEl.dataset.confirmButton })) return;
        await this.load(form.getAttribute('action') ?? location.href, this.#formData(form, e.submitter), { retryPost: 'retryPost' in form.dataset });
    }
    async loading() {
        this.contentEl.innerHTML = this.#getSpinnerHtml();
        await this.show();
    }
    async load(url, params, options = {}) {
        await this.loading();
        await this.request(url, params, options);
    }
    async confirm(text, options = {}) {
        this.contentEl.innerHTML = this.#getConfirmHtml(options.title ?? this.messages.confirmTitle, options.button ?? this.messages.confirmButton);
        this.contentEl.querySelector('.modal-body').textContent = text;
        const confirmed = new Promise(resolve => {
            const onHidden = () => resolve(false);
            this.modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
            this.contentEl.querySelector('[data-dv-confirm]').addEventListener('click', () => {
                this.modalEl.removeEventListener('hidden.bs.modal', onHidden);
                resolve(true);
            }, { once: true });
        });
        await this.show();
        this.contentEl.querySelector('[data-dv-confirm]').focus();
        return confirmed;
    }
    async onFormSubmit(form, e) {
        const params = this.#formData(form, e.submitter);
        const content = Array.from(this.contentEl.childNodes);
        this.contentEl.innerHTML = this.#getSpinnerHtml();
        // noinspection JSCheckFunctionSignatures
        await this.request(e.target['action'], params, { onFail: (message) => {
            this.contentEl.replaceChildren(...content);
            this.#showFormError(form, message);
        } });
    }
    #formData(form, submitter) {
        const params = new FormData(form);
        if (submitter?.name) params.append(submitter.name, submitter.value);
        return params;
    }
    #showFormError(form, message) {
        form.querySelector('[data-dv-error]')?.remove();
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger';
        alert.dataset.dvError = '';
        alert.textContent = message;
        (form.querySelector('.modal-body') ?? form).prepend(alert);
    }
    #showError(message, retry) {
        this.contentEl.innerHTML = this.#getErrorHtml(this.#escape(message), !!retry);
        this.contentEl.querySelector('[data-dv-retry]')?.addEventListener('click', retry, { once: true });
    }
    async request(url, params, options = {}) {
        const fail = options.onFail ?? ((message) => this.#showError(message, params === undefined || options.retryPost ? () => {
            this.contentEl.innerHTML = this.#getSpinnerHtml();
            this.request(url, params, options).then();
        } : null));
        try {
            const fetchResponse = await fetch(url, {
                method: params === undefined ? "GET" : "POST",
                body: params,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (fetchResponse.status === 413) {
                fail(this.messages.requestTooLarge);
            } else if (fetchResponse.status > 400) {
                fail(this.messages.serverError.replace('{status}', fetchResponse.status));
            } else {
                let response = null;
                try {
                    response = await fetchResponse.json();
                } catch (err) {
                    response = null;
                }
                if (!response || !response.result) {
                    fail(this.messages.invalidResponse);
                } else if (this.events[response.result]) {
                    this.events[response.result](response);
                } else {
                    console.log(response);
                }
            }
        } catch (err) {
            fail(err instanceof TypeError ? this.messages.networkError : err.message);
        }
    }
    show() {
        return new Promise((resolve => {
            if (this.modalEl.classList.contains('show')) return resolve();
            this.modalEl.addEventListener('shown.bs.modal', () => { resolve() }, { once: true });
            this.modalBs.show();
        }))
    }
    hide() {
        this.modalBs.hide();
    }
    #getModalHtml() {
        return '<div id="modal-window" class="modal fade"><div class="modal-dialog"><div class="modal-content"></div></div></div>';
    }
    #getSpinnerCss() {
        return '.lds-default {display: inline-block;position: relative;width: 80px;height: 80px;}.lds-default div {position: absolute;width: 6px;height: 6px;background: black;border-radius: 50%;animation: lds-default 1.2s linear infinite;}.lds-default div:nth-child(1) {animation-delay: 0s;top: 37px;left: 66px;}.lds-default div:nth-child(2) {animation-delay: -0.1s;top: 22px;left: 62px;}.lds-default div:nth-child(3) {animation-delay: -0.2s;top: 11px;left: 52px;}.lds-default div:nth-child(4) {animation-delay: -0.3s;top: 7px;left: 37px;}.lds-default div:nth-child(5) {animation-delay: -0.4s;top: 11px;left: 22px;}.lds-default div:nth-child(6) {animation-delay: -0.5s;top: 22px;left: 11px;}.lds-default div:nth-child(7) {animation-delay: -0.6s;top: 37px;left: 7px;}.lds-default div:nth-child(8) {animation-delay: -0.7s;top: 52px;left: 11px;}.lds-default div:nth-child(9) {animation-delay: -0.8s;top: 62px;left: 22px;}.lds-default div:nth-child(10) {animation-delay: -0.9s;top: 66px;left: 37px;}.lds-default div:nth-child(11) {animation-delay: -1s;top: 62px;left: 52px;}.lds-default div:nth-child(12) {animation-delay: -1.1s;top: 52px;left: 62px;}@keyframes lds-default {0%, 20%, 80%, 100% {transform: scale(1);}  50% {transform: scale(1.5);}}';
    }
    #getSpinnerHtml() {
        return '<div style="text-align: center; padding: 20px;"><div class="lds-default"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div>';
    }
    #getConfirmHtml(title, button) {
        return '<div class="modal-header"><h4 class="modal-title">' + this.#escape(title) + '</h4><button type="button" class="btn-close" data-bs-dismiss="modal" title="' + this.#escape(this.messages.close) + '"></button></div>'
            + '<div class="modal-body" style="white-space: pre-line"></div>'
            + '<div class="modal-footer justify-content-between"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' + this.#escape(this.messages.cancel) + '</button>'
            + '<button type="button" class="btn btn-primary" data-dv-confirm>' + this.#escape(button) + '</button></div>';
    }
    #getErrorHtml(message, retry = false) {
        return '<div class="modal-header"><h4 class="modal-title">' + this.#escape(this.messages.errorTitle) + '</h4><button type="button" class="btn-close" data-bs-dismiss="modal" title="' + this.#escape(this.messages.close) + '"></button></div>'
            + '<div class="modal-body">' + message + '</div>'
            + '<div class="modal-footer justify-content-between"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' + this.#escape(this.messages.close) + '</button>'
            + (retry ? '<button type="button" class="btn btn-primary" data-dv-retry>' + this.#escape(this.messages.retry) + '</button>' : '') + '</div>';
    }
    #escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/"/g, '&quot;');
    }
}
