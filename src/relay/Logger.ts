export const all_logs = [];

export default class Logger {
    static enabled = true

    static get info(): any {
        return (msg, data) => {
            all_logs.push(msg);
            if (data) {
                all_logs.push(JSON.stringify(data));
            }
        }
    }

    static get error(): any {
        return (msg, data) => {
            all_logs.push(msg);
            if (data) {
                all_logs.push(JSON.stringify(data));
            }
        }
    }
}
