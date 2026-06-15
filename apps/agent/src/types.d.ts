declare module '*.md' {
	import type { Skill } from '@flue/runtime';

	const skill: Skill;
	export default skill;
}
