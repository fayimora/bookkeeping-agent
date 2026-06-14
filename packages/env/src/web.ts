import { createEnv } from '@t3-oss/env-core';

type ImportMetaWithEnv = ImportMeta & {
	readonly env: Record<string, boolean | string | undefined>;
};

export const env = createEnv({
	clientPrefix: 'VITE_',
	client: {},
	runtimeEnv: (import.meta as ImportMetaWithEnv).env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
