import type {
    AppDataField,
    DecryptedItem,
    DecryptedTransferPayload,
    ItemContent,
    MessageData,
    OutgoingItemMessagePayload,
} from '@standardnotes/snjs'
import {environmentToString, generateUuid, isValidJsonString} from './Utils'
import Logger from './Logger'
import {MessagePayload} from './Types/MessagePayload'
import {Component} from './Types/Component'
import {MessagePayloadApi} from './Types/MessagePayloadApi'
import {ComponentAction} from './Types/ComponentAction'
import {Environment} from './Types/Environment'
import {SnMediatorOptions} from "../api/sn-types";

const DEFAULT_COALLESED_SAVING_DELAY = 250

class ComponentRelay {
    private contentWindow: Window
    private component: Component = {activeThemes: [], acceptsThemes: true}
    private sentMessages: MessagePayload[] = []
    private messageQueue: MessagePayload[] = []
    private lastStreamedItem?: DecryptedTransferPayload
    private pendingSaveItems?: DecryptedTransferPayload[]
    private pendingSaveTimeout?: NodeJS.Timeout
    private pendingSaveParams?: any
    private messageHandler?: (event: any) => void
    private concernTimeouts: NodeJS.Timeout[] = []
    private coallesedSavingDelay;
    private subscriptions = [];


    public initialize(options: SnMediatorOptions = {}) {
        Logger.info('debug 2');

        if (this.contentWindow) {
            Logger.error('fatal: cannot call initialize more than once');
            return;
        }
        this.coallesedSavingDelay = typeof options.debounceSave !== 'undefined' ? options.debounceSave : DEFAULT_COALLESED_SAVING_DELAY;
        this.contentWindow = window;

        this.registerMessageHandler();

        this.postMessage(ComponentAction.StreamContextItem, {}, (data) => {
            const {item} = data;

            this.lastStreamedItem = item;
            if (!this.lastStreamedItem.isMetadataUpdate) {
                this.subscriptions.forEach((sub) => {
                    // sub(this.text, this.meta);
                });
            }
        });
    }

    private registerMessageHandler() {
        this.messageHandler = (event: MessageEvent) => {
            Logger.info('Components API Message received:', event.data)

            /**
             * We don't have access to window.parent.origin due to cross-domain restrictions.
             * Check referrer if available, otherwise defer to checking for first-run value.
             * Craft URL objects so that example.com === example.com/
             */
            if (document.referrer) {
                const referrer = new URL(document.referrer).origin
                const eventOrigin = new URL(event.origin).origin

                if (referrer !== eventOrigin) {
                    return
                }
            }

            // Mobile environment sends data as JSON string.
            const {data} = event
            const parsedData = isValidJsonString(data) ? JSON.parse(data) : data

            if (!parsedData) {
                Logger.error('Invalid data received. Skipping...')
                return
            }

            /**
             * The Component Registered message will be the most reliable one, so we won't change it after any subsequent events,
             * in case you receive an event from another window.
             */
            if (typeof this.component.origin === 'undefined' && parsedData.action === ComponentAction.ComponentRegistered) {
                this.component.origin = event.origin
                Logger.info('origin is: ' + event.origin);
            } else if (event.origin !== this.component.origin) {
                // If event origin doesn't match first-run value, return.
                return
            }

            this.handleMessage(parsedData)
        }

        this.contentWindow.addEventListener('message', this.messageHandler, false)
    }


    private handleMessage(payload: MessagePayload) {
        switch (payload.action) {
            case ComponentAction.ComponentRegistered:
                this.component.sessionKey = payload.sessionKey
                if (payload.componentData) {
                    this.component.data = payload.componentData
                }
                this.onReady(payload.data)
                Logger.info('Component successfully registered with payload:', payload)
                break

            case ComponentAction.ActivateThemes:
                this.activateThemes(payload.data.themes)
                break

            default: {
                if (!payload.original) {
                    return
                }

                // Get the callback from queue.
                const originalMessage = this.sentMessages?.filter((message: MessagePayload) => {
                    return message.messageId === payload.original?.messageId
                })[0]

                if (!originalMessage) {
                    // Connection must have been reset. We should alert the user unless it's a reply,
                    // in which case we may have been deallocated and reinitialized and lost the
                    // original message
                    const extensionName = this.contentWindow.document.title
                    const alertMessage = (
                        `The extension '${extensionName}' is attempting to communicate with Standard Notes, ` +
                        'but an error is preventing it from doing so. Please restart this extension and try again.'
                    ).replace('  ', ' ')

                    Logger.info(alertMessage)
                    return
                }

                originalMessage?.callback?.(payload.data)
                break
            }
        }
    }

    private onReady(data: MessageData) {
        this.component.environment = data.environment
        this.component.platform = data.platform
        this.component.uuid = data.uuid

        for (const message of this.messageQueue) {
            this.postMessage(message.action as ComponentAction, message.data, message.callback)
        }

        this.messageQueue = []

        Logger.info('Data passed to onReady:', data)

        this.activateThemes(data.activeThemeUrls || [])

        // After activateThemes is done, we want to send a message with the ThemesActivated action.
        this.postMessage(ComponentAction.ThemesActivated, {})
    }

    /**
     * Checks if the component is running in a Desktop application.
     */
    public isRunningInDesktopApplication(): boolean {
        return this.component.environment === environmentToString(Environment.Desktop)
    }

    /**
     * Checks if the component is running in a Mobile application.
     */
    public isRunningInMobileApplication(): boolean {
        return this.component.environment === environmentToString(Environment.Mobile)
    }

    /**
     * Gets the component's data value for the specified key.
     * @param key The key for the data object.
     * @returns `undefined` if the value for the key does not exist. Returns the stored value otherwise.
     */
    public getComponentDataValueForKey(key: string): any {
        if (!this.component.data) {
            return
        }
        return this.component.data[key]
    }

    /**
     * Sets the component's data value for the specified key.
     * @param key The key for the data object.
     * @param value The value to store under the specified key.
     */
    public setComponentDataValueForKey(key: string, value: any): void {
        if (!this.component.data) {
            throw new Error('The component has not been initialized.')
        }
        if (!key || (key && key.length === 0)) {
            throw new Error('The key for the data value should be a valid string.')
        }
        this.component.data = {
            ...this.component.data,
            [key]: value,
        }
        this.postMessage(ComponentAction.SetComponentData, {
            componentData: this.component.data,
        })
    }

    /**
     * Clears the component's data object.
     */
    public clearComponentData(): void {
        this.component.data = {}
        this.postMessage(ComponentAction.SetComponentData, {
            componentData: this.component.data,
        })
    }

    private postMessage(action: ComponentAction, data: MessageData, callback?: (...params: any) => void) {
        /**
         * If the sessionKey is not set, we push the message to queue
         * that will be processed later on.
         */
        if (!this.component.sessionKey) {
            this.messageQueue.push({
                action,
                data,
                api: MessagePayloadApi.Component,
                callback: callback,
            })
            return
        }

        const message = {
            action,
            data,
            messageId: this.generateUUID(),
            sessionKey: this.component.sessionKey,
            api: MessagePayloadApi.Component,
        }

        const sentMessage = JSON.parse(JSON.stringify(message))
        sentMessage.callback = callback
        this.sentMessages.push(sentMessage)

        let postMessagePayload

        // Mobile (React Native) requires a string for the postMessage API.
        if (this.isRunningInMobileApplication()) {
            postMessagePayload = JSON.stringify(message)
        } else {
            postMessagePayload = message
        }

        Logger.info('Posting message:', postMessagePayload)
        this.contentWindow.parent.postMessage(postMessagePayload, this.component.origin!)
    }

    private activateThemes(incomingUrls: string[] = []) {
        if (!this.component.acceptsThemes) {
            return
        }

        Logger.info('Incoming themes:', incomingUrls)

        const {activeThemes} = this.component

        if (activeThemes && activeThemes.sort().toString() == incomingUrls.sort().toString()) {
            // Incoming theme URLs are same as active, do nothing.
            return
        }

        let themesToActivate = incomingUrls
        const themesToDeactivate = []

        for (const activeUrl of activeThemes) {
            if (!incomingUrls.includes(activeUrl)) {
                // Active not present in incoming, deactivate it.
                themesToDeactivate.push(activeUrl)
            } else {
                // Already present in active themes, remove it from themesToActivate.
                themesToActivate = themesToActivate.filter((candidate) => {
                    return candidate !== activeUrl
                })
            }
        }

        Logger.info('Deactivating themes:', themesToDeactivate)
        Logger.info('Activating themes:', themesToActivate)

        for (const themeUrl of themesToDeactivate) {
            this.deactivateTheme(themeUrl)
        }

        this.component.activeThemes = incomingUrls

        for (const themeUrl of themesToActivate) {
            if (!themeUrl) {
                continue
            }

            const link = this.contentWindow.document.createElement('link')
            link.id = btoa(themeUrl)
            link.href = themeUrl
            link.type = 'text/css'
            link.rel = 'stylesheet'
            link.media = 'screen,print'
            link.className = 'custom-theme'
            this.contentWindow.document.getElementsByTagName('head')[0].appendChild(link)
        }

    }

    private themeElementForUrl(themeUrl: string) {
        const elements = Array.from(this.contentWindow.document.getElementsByClassName('custom-theme')).slice()
        return elements.find((element) => {
            // We used to search here by `href`, but on desktop, with local file:// urls, that didn't work for some reason.
            return element.id == btoa(themeUrl)
        })
    }

    private deactivateTheme(themeUrl: string) {
        const element = this.themeElementForUrl(themeUrl)
        if (element && element.parentNode) {
            element.setAttribute('disabled', 'true')
            element.parentNode.removeChild(element)
        }
    }

    private generateUUID() {
        return generateUuid()
    }

    /**
     * Gets the current platform where the component is running.
     */
    public get platform(): string | undefined {
        return this.component.platform
    }

    /**
     * Gets the current environment where the component is running.
     */
    public get environment(): string | undefined {
        return this.component.environment
    }


    /**
     * Streams the current Item in context.
     * @param callback A callback to process the streamed item.
     */
    public streamContextItem(callback: (data: any) => void): void {
        this.postMessage(ComponentAction.StreamContextItem, {}, (data) => {
            const {item} = data
            /**
             * If this is a new context item than the context item the component was currently entertaining,
             * we want to immediately commit any pending saves, because if you send the new context item to the
             * component before it has commited its presave, it will end up first replacing the UI with new context item,
             * and when the debouncer executes to read the component UI, it will be reading the new UI for the previous item.
             */
            const isNewItem = !this.lastStreamedItem || this.lastStreamedItem.uuid !== item.uuid

            if (isNewItem && this.pendingSaveTimeout) {
                clearTimeout(this.pendingSaveTimeout)
                this.performSavingOfItems(this.pendingSaveParams)
                this.pendingSaveTimeout = undefined
                this.pendingSaveParams = undefined
            }

            this.lastStreamedItem = item
            callback(this.lastStreamedItem)
        })
    }


    /**
     * Saves an existing Item in the item store.
     * @param item An existing Item to be saved.
     * @param callback
     * @param skipDebouncer
     */
    public saveItem(item: DecryptedTransferPayload, callback?: () => void, skipDebouncer = false): void {
        this.saveItems([item], callback, skipDebouncer)
    }

    /**
     * Runs a callback before saving an Item.
     * @param item An existing Item to be saved.
     * @param presave Allows clients to perform any actions last second before the save actually occurs (like setting previews).
     * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
     * hook into the debounce cycle so that clients don't have to implement their own debouncing.
     * @param callback
     */
    public saveItemWithPresave<C extends ItemContent = ItemContent>(
        item: DecryptedTransferPayload<C>,
        presave: any,
        callback?: () => void,
    ): void {
        this.saveItemsWithPresave([item], presave, callback)
    }

    /**
     * Runs a callback before saving a collection of Items.
     * @param items A collection of existing Items to be saved.
     * @param presave Allows clients to perform any actions last second before the save actually occurs (like setting previews).
     * Saves debounce by default, so if a client needs to compute a property on an item before saving, it's best to
     * hook into the debounce cycle so that clients don't have to implement their own debouncing.
     * @param callback
     */
    public saveItemsWithPresave(items: DecryptedTransferPayload[], presave: any, callback?: () => void): void {
        this.saveItems(items, callback, false, presave)
    }

    private performSavingOfItems({
                                     items,
                                     presave,
                                     callback,
                                 }: {
        items: DecryptedTransferPayload[]
        presave: () => void
        callback?: () => void
    }) {
        const ConcernIntervalMS = 5000
        const concernTimeout = setTimeout(() => {
            this.concernTimeouts.forEach((timeout) => clearTimeout(timeout))
            alert(
                'This editor is unable to communicate with Standard Notes. ' +
                'Your changes may not be saved. Please backup your changes, then restart the ' +
                'application and try again.',
            )
        }, ConcernIntervalMS)

        this.concernTimeouts.push(concernTimeout)

        /**
         * Presave block allows client to gain the benefit of performing something in the debounce cycle.
         */
        presave && presave()

        const mappedItems = []
        for (const item of items) {
            mappedItems.push(this.jsonObjectForItem(item))
        }

        const wrappedCallback = () => {
            this.concernTimeouts.forEach((timeout) => clearTimeout(timeout))
            callback?.()
        }

        this.postMessage(ComponentAction.SaveItems, {items: mappedItems}, wrappedCallback)
    }

    /**
     * Saves a collection of existing Items.
     * @param items The items to be saved.
     * @param callback
     * @param skipDebouncer Allows saves to go through right away rather than waiting for timeout.
     * This should be used when saving items via other means besides keystrokes.
     * @param presave
     */
    public saveItems(
        items: DecryptedTransferPayload[],
        callback?: () => void,
        skipDebouncer = false,
        presave?: any,
    ): void {
        /**
         * We need to make sure that when we clear a pending save timeout,
         * we carry over those pending items into the new save.
         */
        if (!this.pendingSaveItems) {
            this.pendingSaveItems = []
        }

        if (this.coallesedSavingDelay && !skipDebouncer) {
            if (this.pendingSaveTimeout) {
                clearTimeout(this.pendingSaveTimeout)
            }

            const incomingIds = items.map((item) => item.uuid)
            /**
             * Replace any existing save items with incoming values.
             * Only keep items here who are not in incomingIds.
             */
            const preexistingItems = this.pendingSaveItems.filter((item) => {
                return !incomingIds.includes(item.uuid)
            })

            // Add new items, now that we've made sure it's cleared of incoming items.
            this.pendingSaveItems = preexistingItems.concat(items)

            // We'll potentially need to commit early if stream-context-item message comes in.
            this.pendingSaveParams = {
                items: this.pendingSaveItems,
                presave,
                callback,
            }

            this.pendingSaveTimeout = setTimeout(() => {
                this.performSavingOfItems(this.pendingSaveParams)
                this.pendingSaveItems = []
                this.pendingSaveTimeout = undefined
                this.pendingSaveParams = null
            }, this.coallesedSavingDelay)
        } else {
            this.performSavingOfItems({items, presave, callback})
        }
    }

    private jsonObjectForItem(item: DecryptedItem | DecryptedTransferPayload) {
        const copy = Object.assign({}, item) as any
        copy.children = null
        copy.parent = null
        return copy
    }

    /**
     * Gets the Item's appData value for the specified key.
     * Uses the default domain (org.standardnotes.sn).
     * This function is used with Items returned from streamContextItem() and streamItems()
     * @param item The Item to get the appData value from.
     * @param key The key to get the value from.
     */
    public getItemAppDataValue(item: OutgoingItemMessagePayload | undefined, key: AppDataField | string): any {
        const defaultDomain = 'org.standardnotes.sn'
        const domainData = item?.content?.appData?.[defaultDomain]
        return domainData?.[key as AppDataField]
    }
}

export const snApi = new ComponentRelay();
export default snApi;
