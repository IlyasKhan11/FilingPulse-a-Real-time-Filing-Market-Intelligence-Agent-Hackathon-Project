import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class DeliveryService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  sendAlert(alert: any) {
    if (this.server) {
      this.server.emit('new_alert', alert);
      console.log('Alert sent via Socket.io:', alert.company);
    } else {
      console.log('Socket server not ready yet');
    }
  }
}