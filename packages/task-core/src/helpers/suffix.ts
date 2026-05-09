export class Suffix {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  get valueWithHyphen(): string {
    return `-${this.value}`;
  }
}
