import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { FilingAlert } from '../ingestion/ingestion.types';

@Injectable()
export class DeliveryService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  sendAlert(alert: FilingAlert) {
    if (this.server) {
      this.server.emit('new_alert', alert);
      console.log('Alert sent via Socket.io:', alert.company);
    } else {
      console.log('Socket server not ready yet');
    }
  }
}
