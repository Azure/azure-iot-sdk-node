export interface AmqpLink {
  attach: (callback: (err?: Error) => void) => void;
  detach: () => void;
}
