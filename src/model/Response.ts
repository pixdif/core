export const enum ResponseStatus {
	Ok = 200,
	Created = 201,
	Accepted = 202,
	NonAuthoritativeInformation = 203,
	NoContent = 204,
	ResetContent = 205,
	PartialContent = 206,

	BadRequest = 400,
	Unauthorized = 401,
	Forbidden = 403,
	NotFound = 404,
	Conflict = 409,

	InternalServerError = 500,
}

export interface Response<BodyType> {
	status: ResponseStatus;
	body?: BodyType;
}
