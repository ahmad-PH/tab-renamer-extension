class Subject {
    constructor() {
        this._value = null;
        this.observers = [];
    }

    subscribe(observer) {
        this.observers.push(observer);
    }

    unsubscribe(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    setValue(value) {
        this._value = value;
        this._notify(value);
    }

    getValue() {
        return this._value;
    }

    _notify(data) {
        this.observers.forEach(observer => observer(data));
    }
}


export default Subject;
