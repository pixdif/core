export const enum RequestMethod {
	Get = 'GET',
	Post = 'POST',
	Head = 'HEAD',
	Put = 'PUT',
	Patch = 'PATCH',
	Delete = 'DELETE',
}

export const enum RequestContext {
	Snapshot = 'snapshot',
}

export interface Request<PayloadType> {
	method: RequestMethod;
	context: RequestContext;
	payload?: PayloadType;
}
