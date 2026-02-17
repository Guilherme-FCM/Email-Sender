export default class Email {
  constructor(
    public from: string,
    public to: string | string[],
    public subject: string,
    public message: string,
    public text?: string
  ) {}
}