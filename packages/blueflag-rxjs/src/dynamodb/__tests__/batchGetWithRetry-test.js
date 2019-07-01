// @flow
import batchGetWithRetry from '../batchGetWithRetry';
import {from} from 'rxjs';
import {tap} from 'rxjs/operators';

describe('batchGetWithRetry', () => {

    it('batchGetWithRetry should pass params and make request', async () => {

        let responsePayload = {
            UnprocessedKeys: {}
        };

        let docClient = {
            batchGet: jest.fn()
                .mockImplementation(() => ({
                    promise: () => Promise.resolve(responsePayload)
                }))
        };

        let tapFn = jest.fn();

        let params = [1,2,3];

        await from(params)
            .pipe(
                batchGetWithRetry({
                    docClient,
                    tableName: 'fake-table'
                }),
                tap(tapFn)
            )
            .toPromise();

        expect(tapFn).toHaveBeenCalledTimes(1);
        expect(tapFn.mock.calls[0][0]).toEqual(responsePayload);

        expect(docClient.batchGet).toHaveBeenCalledTimes(1);
        expect(docClient.batchGet.mock.calls[0][0]).toEqual({
            RequestItems: {
                'fake-table': {
                    Keys: params
                }
            }
        });
    });

    it('batchGetWithRetry should batch in groups of 100', async () => {

        let responsePayload = {
            UnprocessedKeys: {}
        };

        let docClient = {
            batchGet: jest.fn()
                .mockImplementation(() => ({
                    promise: () => Promise.resolve(responsePayload)
                }))
        };

        let tapFn = jest.fn();

        let params = [];

        for(let i = 0; i < 130; i++) {
            params.push(i);
        }

        await from(params)
            .pipe(
                batchGetWithRetry({
                    docClient,
                    tableName: 'fake-table'
                }),
                tap(tapFn)
            )
            .toPromise();

        expect(tapFn).toHaveBeenCalledTimes(2);
        expect(tapFn.mock.calls[0][0]).toEqual(responsePayload);
        expect(tapFn.mock.calls[1][0]).toEqual(responsePayload);

        expect(docClient.batchGet).toHaveBeenCalledTimes(2);
        expect(docClient.batchGet.mock.calls[0][0]).toEqual({
            RequestItems: {
                'fake-table': {
                    Keys: params.slice(0,100)
                }
            }
        });
        expect(docClient.batchGet.mock.calls[1][0]).toEqual({
            RequestItems: {
                'fake-table': {
                    Keys: params.slice(100)
                }
            }
        });
    });

    it('batchGetWithRetry should retry unprocessed items', async () => {

        let responsePayloads = [
            {
                UnprocessedKeys: {
                    'fake-table': [
                        {
                            Keys: 3
                        }
                    ]
                }
            },
            {
                UnprocessedKeys: {}
            }
        ];

        let docClient = {
            batchGet: jest.fn()
                .mockImplementationOnce(() => ({
                    promise: () => Promise.resolve(responsePayloads[0])
                }))
                .mockImplementationOnce(() => ({
                    promise: () => Promise.resolve(responsePayloads[1])
                }))
        };

        let tapFn = jest.fn();

        let params = [1,2,3];

        await from(params)
            .pipe(
                batchGetWithRetry({
                    docClient,
                    tableName: 'fake-table'
                }),
                tap(tapFn)
            )
            .toPromise();

        expect(docClient.batchGet).toHaveBeenCalledTimes(2);
        expect(docClient.batchGet.mock.calls[0][0]).toEqual({
            RequestItems: {
                'fake-table': {
                    Keys: params
                }
            }
        });
        expect(docClient.batchGet.mock.calls[1][0]).toEqual({
            RequestItems: {
                'fake-table': [
                    {
                        Keys: 3
                    }
                ]
            }
        });

        expect(tapFn).toHaveBeenCalledTimes(2);
        expect(tapFn.mock.calls[0][0]).toEqual(responsePayloads[0]);
        expect(tapFn.mock.calls[1][0]).toEqual(responsePayloads[1]);
    });


});
