import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET
} from "$env/static/private";

export const r2Bucket = R2_BUCKET;

export const r2 = new S3Client({
	region: "auto",
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY
	}
});

export async function presign(key: string, expiresInSeconds = 3600): Promise<string> {
	const cmd = new GetObjectCommand({ Bucket: r2Bucket, Key: key });
	return getSignedUrl(r2, cmd, { expiresIn: expiresInSeconds });
}

export async function fetchKeyText(key: string): Promise<string> {
	const cmd = new GetObjectCommand({ Bucket: r2Bucket, Key: key });
	const res = await r2.send(cmd);
	if (!res.Body) throw new Error(`empty body for ${key}`);
	return res.Body.transformToString();
}

export async function listKeys(prefix: string): Promise<string[]> {
	const all: string[] = [];
	let continuationToken: string | undefined;
	do {
		const res = await r2.send(
			new ListObjectsV2Command({
				Bucket: r2Bucket,
				Prefix: prefix,
				ContinuationToken: continuationToken
			})
		);
		for (const obj of res.Contents ?? []) {
			if (obj.Key) all.push(obj.Key);
		}
		continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
	} while (continuationToken);
	return all;
}
