import ResizeSensor from 'css-element-queries/src/ResizeSensor';
import './sticky-sidebar.css';

class StickySidebar {
    options = {};

    classPrefix = 'ss';

    get containerClass() {
        return `${this.classPrefix}-container`;
    }

    get sidebarClass() {
        return `${this.classPrefix}-sidebar`;
    }

    get stickyTopClass() {
        return `${this.classPrefix}-sticky-top`;
    }

    get stickyBottomClass() {
        return `${this.classPrefix}-sticky-bottom`;
    }

    target = null;
    targetParent = null;
    container = null;
    sidebar = null;

    currentScroll = window.pageYOffset;
    scrollDirection = '';

    stickyPosition = '';

    eventHandlers = new Map();
    resizeSensorHandlers = new Map();

    constructor(sidebar, customOptions = {}) {
        this.options = {
            ...this.options,
            ...customOptions
        };

        if (typeof sidebar === 'string') {
            this.target = document.querySelector(sidebar);

            if (!this.target) {
                throw new Error('sidebar element not found');
            }
        } else if (sidebar instanceof HTMLElement) {
            this.target = sidebar;
        } else {
            throw new Error('wrong sidebar element type');
        }

        this.initialize();
    }

    initialize() {
        this.createLayout();
        this.bindMethods();
        this.debounceMethods();
        this.setResizeSensorHandlers();
        this.setEventHandlers();
        this.initResizeSensorActions('add');
        this.initEventActions('add');
        this.update();
    }

    destroy() {
        this.initEventActions('remove');
        this.initResizeSensorActions('remove');
        this.resetValues();
        this.destroyLayout();
    }

    createLayout() {
        this.targetParent = this.target.parentElement;

        this.sidebar = document.createElement('div');
        this.sidebar.className = this.sidebarClass;

        this.container = document.createElement('div');
        this.container.className = this.containerClass;

        this.sidebar.append(this.target);
        this.container.append(this.sidebar);

        this.targetParent.append(this.container);
    }

    destroyLayout() {
        this.container.parentElement.append(this.target);
        this.container.remove();
    }

    bindMethods() {
        [
            'windowScrollHandler',
            'update',
            'sidebarResizeHandler',
            'containerResizeHandler'
        ].forEach((method) => {
            this[method] = this[method].bind(this);
        });
    }

    debounceMethods() {
        [
            'windowScrollHandler',
            'update'
        ].forEach((method) => {
            this[method] = StickySidebar.debounce(this[method]);
        });
    }

    setEventHandlers() {
        [
            [window, {
                scroll: {
                    handler: this.windowScrollHandler
                },
                resize: {
                    handler: this.update
                }
            }]
        ].forEach((item) => {
            this.eventHandlers.set(item[0], item[1]);
        });
    }

    setResizeSensorHandlers() {
        [
            [this.sidebar, this.sidebarResizeHandler],
            [this.container, this.containerResizeHandler]
        ].forEach((item) => {
            this.resizeSensorHandlers.set(item[0], item[1]);
        });
    }

    initEventActions(action) {
        this.eventHandlers.forEach((events, elements) => {
            elements = StickySidebar.htmlElementsToArray(elements);

            elements.forEach((element) => {
                Object.keys(events).forEach((eventType) => {
                    const eventHandler = events[eventType].handler;

                    if (action === 'add') {
                        const paramsOnAdd = events[eventType].paramsOnAdd || [];

                        element.addEventListener(eventType, eventHandler, ...paramsOnAdd);
                    } else if (action === 'remove') {
                        const paramsOnRemove = events[eventType].paramsOnRemove || [];

                        element.removeEventListener(eventType, eventHandler, ...paramsOnRemove);
                    }
                });
            });
        });
    }

    initResizeSensorActions(action) {
        this.resizeSensorHandlers.forEach((handler, elements) => {
            elements = StickySidebar.htmlElementsToArray(elements);

            elements.forEach((element) => {
                if (action === 'add') {
                    new ResizeSensor(element, handler);
                } else if (action === 'remove') {
                    ResizeSensor.detach(element, handler);
                }
            });
        });
    }

    windowScrollHandler() {
        this.setScrollDirection();

        if (!this.checkStickyPossibility() || !this.checkStickyScrolling()) {
            return;
        }

        if (this.checkTopInContainer()) {
            if (this.scrollDirection === 'down') {
                this.setBottomStickyPosition();
            } else {
                this.container.style.paddingBottom = '';
            }
        } else if (this.checkBottomInContainer()) {
            if (this.scrollDirection === 'up') {
                this.setTopStickyPosition();
            } else {
                this.container.style.paddingTop = '';
            }
        } else {
            if (this.scrollDirection === 'up') {
                if (this.stickyPosition === 'bottom') {
                    this.container.style.paddingBottom = `${this.container.clientHeight - (this.sidebar.offsetTop + this.sidebar.offsetHeight)}px`;
                    this.setTopStickyPosition();
                }
            } else {
                if (this.stickyPosition === 'top') {
                    this.container.style.paddingTop = `${this.sidebar.offsetTop}px`;
                    this.setBottomStickyPosition();
                }
            }
        }
    }

    sidebarResizeHandler() {
        this.update();
    }

    containerResizeHandler() {
        this.update();
    }

    stickyPositionCorrection() {
        const topPosition = this.getTopStickyPosition();
        const bottomPosition = this.getBottomStickyPosition();

        const currentTopSpacing = this.sidebar.offsetTop;
        const currentBottomSpacing = this.container.clientHeight - (this.sidebar.offsetTop + this.sidebar.offsetHeight);

        const currentTopPosition = currentTopSpacing > topPosition ? topPosition : currentTopSpacing;
        const currentBottomPosition = currentBottomSpacing > bottomPosition ? bottomPosition : currentBottomSpacing;

        const topInViewport = this.sidebar.getBoundingClientRect().top > 0 && this.sidebar.getBoundingClientRect().top - currentTopPosition > 0;
        const bottomInViewport = this.sidebar.getBoundingClientRect().bottom > 0 && (this.sidebar.getBoundingClientRect().bottom + currentBottomPosition) - document.documentElement.clientHeight < 0;

        if (topInViewport) {
            this.setTopStickyPosition();
        } else if (bottomInViewport) {
            this.setBottomStickyPosition();
        }
    }

    update() {
        if (this.checkStickyPossibility()) {
            if (this.checkStickyScrolling()) {
                if (this.checkBetweenInContainer()) {
                    this.stickyPositionCorrection();
                } else {
                    this.setInitialStickyPosition();
                }
            } else {
                this.resetValues();
                this.setTopStickyPosition();
            }
        } else {
            this.resetValues();
        }
    }

    checkTopInContainer() {
        return this.sidebar.offsetTop === 0;
    }

    checkBottomInContainer() {
        return this.sidebar.offsetTop + this.sidebar.offsetHeight === this.container.clientHeight;
    }

    checkBetweenInContainer() {
        return !this.checkTopInContainer() && !this.checkBottomInContainer();
    }

    checkStickyPossibility() {
        return this.container.clientHeight > this.sidebar.offsetHeight;
    }

    checkStickyScrolling() {
        const topPosition = this.getTopStickyPosition();
        const bottomPosition = this.getBottomStickyPosition();
        const viewportHeight = document.documentElement.clientHeight - topPosition - bottomPosition;

        return this.sidebar.offsetHeight > viewportHeight;
    }

    setInitialStickyPosition() {
        if (this.checkTopInContainer()) {
            this.setBottomStickyPosition();
        } else if (this.checkBottomInContainer()) {
            this.setTopStickyPosition();
        }
    }

    setTopStickyPosition() {
        this.container.style.paddingTop = '';
        this.container.classList.remove(this.stickyBottomClass);
        this.container.classList.add(this.stickyTopClass);
        this.stickyPosition = 'top';
    }

    setBottomStickyPosition() {
        this.container.style.paddingBottom = '';
        this.container.classList.remove(this.stickyTopClass);
        this.container.classList.add(this.stickyBottomClass);
        this.stickyPosition = 'bottom';
    }

    resetValues() {
        this.container.style.paddingTop = '';
        this.container.style.paddingBottom = '';
        this.container.classList.remove(this.stickyTopClass, this.stickyBottomClass);
    }

    setScrollDirection() {
        if (window.pageYOffset > this.currentScroll) {
            this.scrollDirection = 'down';
        }

        if (window.pageYOffset < this.currentScroll) {
            this.scrollDirection = 'up';
        }

        this.currentScroll = window.pageYOffset;
    }

    getTopStickyPosition() {
        return StickySidebar.getStyleValue(this.sidebar, '--top-position');
    }

    getBottomStickyPosition() {
        return StickySidebar.getStyleValue(this.sidebar, '--bottom-position');
    }

    static getStyleValue(element, propertyName) {
        return parseFloat(window.getComputedStyle(element).getPropertyValue(propertyName));
    }

    static htmlElementsToArray(elements) {
        return StickySidebar.type(elements) === 'NodeList' ? [...elements] : [elements];
    }

    static type(value) {
        return Object.prototype.toString.call(value).match(/^\[object (\S+?)]$/)[1] || 'undefined';
    }

    static debounce(fn) {
        let rafId;

        return function (...args) {
            const context = this;

            if (rafId) {
                window.cancelAnimationFrame(rafId);
            }

            rafId = window.requestAnimationFrame(() => {
                fn.apply(context, args);
            });
        };
    }
}

export default StickySidebar;
