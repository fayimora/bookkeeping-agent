import { createEnv } from '@t3-oss/env-core';

type ImportMetaWithEnv = ImportMeta & {
	readonly env: Record<string, boolean | string | undefined>;
};

export const env = createEnv({
	client: {},
	clientPrefix: 'VITE_',
	emptyStringAsUndefined: true,
	runtimeEnv: (import.meta as ImportMetaWithEnv).env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
