const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (timestamp: number) => dateFormatter.format(new Date(timestamp));

export const toIsoString = (timestamp: number) => new Date(timestamp).toISOString();

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const relativeUnits: Array<[Intl.RelativeTimeFormatUnit, number]> = [
	["year", 365 * 24 * 60 * 60 * 1000],
	["month", 30 * 24 * 60 * 60 * 1000],
	["day", 24 * 60 * 60 * 1000],
	["hour", 60 * 60 * 1000],
	["minute", 60 * 1000]
];

export const formatRelative = (timestamp: number) => {
	const elapsed = timestamp - Date.now();

	for (const [unit, milliseconds] of relativeUnits) {
		if (Math.abs(elapsed) >= milliseconds) {
			return relativeFormatter.format(Math.round(elapsed / milliseconds), unit);
		}
	}

	return "just now";
};

export const installCommand = (packageName: string) => `npm install ${packageName}`;

/** Reads the message of whatever a failed request threw. */
export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
