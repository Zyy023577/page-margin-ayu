export class AIProvider{
  constructor(name){this.name=name;}
  async *streamReply(){throw new Error('AIProvider.streamReply must be implemented');}
}
