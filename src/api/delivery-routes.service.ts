import {Injectable} from '@nestjs/common';
import { QueryOrdersArgs } from '@vendure/admin-ui/core/common/generated-types';
import { Order, OrderState, RequestContext, TransactionalConnection, UserInputError } from '@vendure/core';
import {Not, IsNull, In, FindOperator, Between } from 'typeorm';
import axios from 'axios';
type PlaceDetail={
    name: string,
    placeId: string
}
@Injectable()
export class DeliveryRoutesService{
    constructor(private conn: TransactionalConnection){

    }


    async deliverableOrders(ctx: RequestContext, args: any,){
        const orderRepo= this.conn.getRepository(ctx, Order);
        const orders= await orderRepo.find({where:{
            customFields:{
                google_place_id: Not(IsNull()) as FindOperator<string>,
                Delivery_Collection_Date: Between(args.options?.filter?.Delivery_Collection_Date.between.start,args.options?.filter?.Delivery_Collection_Date.between.end) ,
                Is_Delivery:  args.options?.filter?.Is_Delivery.eq,
            },
            state: Not(In(['Draft','AddingItems','ArrangingPayment','PaymentAuthorized','PaymentSettled','Shipped','Delivered','Cancelled'] as OrderState[])),
            channels:{
                id: ctx.channelId
            }
        }})
        if(!(ctx.channel.customFields as any).google_place_id){
            throw new UserInputError(`Channel ${ctx.channel.code} has no google place id`)
        }
        const originPlaceId= await this.getPlaceIdFromLatLon(args.location.lat,args.location.lon)
        const destination = await this.getPlaceDetails((ctx.channel.customFields as any).google_place_id, `channel ${ctx.channel.code}`)
        const origin= await this.getPlaceDetails(originPlaceId, `your current location`);
        const waypointGooglePlaceDetails: {placeid: string, context: string}[]=[]
        for(let order of orders){
            if(!(order.customFields as any).google_place_id){
                throw new UserInputError(`Order ${order.code} has no google place id set`)
            }
            waypointGooglePlaceDetails.push({placeid: (order.customFields as any).google_place_id, context: `order ${order.code}`})
        }
        const waypointPlaceDetails= await Promise.all(waypointGooglePlaceDetails.map((waypoint)=> this.getPlaceDetails(waypoint.placeid, waypoint.context)))
        const waypoint_place_ids= waypointPlaceDetails.map((detail)=> detail.placeId).join('|')
        const waypoints= waypointPlaceDetails.map((detail)=> detail.name).join('|')
        const url= encodeURI(`https://www.google.com/maps/dir/?api=1&origin=${origin.name}&origin_place_id=${origin.placeId}&destination=${destination.name}&destination_place_id=${destination.placeId}&waypoints=${waypoints}&waypoint_place_ids=${waypoint_place_ids}&travelmode=driving`);
        return {url, orders}

    }


    private async getPlaceDetails(placeId: string, context: string):Promise<PlaceDetail>{
        const API_KEY= process.env.googleapikey;
        const placeDetails= await axios.get(`https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&fields=name&key=${API_KEY}`)
        if(!placeDetails.data.result?.name){
            throw new UserInputError(`Couldn't find location details for ${context}`)
        }
        return {name: placeDetails.data.result.name, placeId}
    }

    private async getPlaceIdFromLatLon(latitude:string,longitude:string):Promise<string>{
        const API_KEY= process.env.googleapikey;
        const queryString= encodeURI(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${latitude},${longitude}&inputtype=textquery&fields=place_id&key=${API_KEY}`);
        const response= await axios.get(queryString);
        if(!response.data.results[0]?.place_id){
            throw new UserInputError(`Couldn't find google place id of your current location`)
        }
        return response.data.results[0]?.place_id;
    }

} 