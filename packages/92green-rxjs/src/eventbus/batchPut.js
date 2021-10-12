import {Observable, interval, zip, of} from "rxjs";
import {map, filter, expand, bufferCount, concatMap,share, throttle} from 'rxjs/operators';
const MAX_EVENT_BRIDGE_PUT = 10;
type Config = {
    eventBridge: any,
    detailType: string,
    source: string,
    eventBusName: string,
    maxAttempts: number,
    throttleMs: number
}

const RETRY_ON = [
    "ThrottlingException",
    "InternalFailure"
]

export default (config: Config) => (obs: Observable) => {
    const sendToEventBus = (obs) => {
        let input  = obs.pipe(share());
        let results = obs.pipe(
            map(([record]) => record),
            bufferCount(MAX_EVENT_BRIDGE_PUT),
            concatMap(records => config.eventBridge.putEvents({Entries: records}).promise()),
            concatMap(ii => ii.Entries)
        );
        return zip(
            input,
            results
        ).pipe(
            map(([input, result]) => {
                let [record, info] = input;
                console.log(record, info)
                return [record, {
                    ...info, 
                    result,
                    attempts: ++info.attempts
                }]
            })
        )
    }
    return obs.pipe(
        map((obj: Object) => {
            return [{
                Detail: JSON.stringify(obj),
                DetailType: config.detailType,
                EventBusName: config.eventBusName,
                Source: config.source,
                Time: new Date()
            }, {attempts: 0}]
         }),
         sendToEventBus,
         expand(ii => of(ii)
            .pipe(
                filter(([_, info]) => {
                    return !info.result.EventId && 
                        RETRY_ON.includes(info.result.ErrorCode) &&
                        info.attempts < config.maxAttempts
                }),
                throttle(() => interval(500)),
                sendToEventBus
            )
        )

    )
}