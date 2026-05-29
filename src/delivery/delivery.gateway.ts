import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { DeliveryService } from './delivery.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class DeliveryGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly deliveryService: DeliveryService) {}

  afterInit(server: Server) {
    this.deliveryService.setServer(server);
    console.log('Socket.io server initialized');
  }
}