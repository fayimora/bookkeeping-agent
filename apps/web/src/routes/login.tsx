import { Button } from '@bookeeping-agent/ui/components/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@bookeeping-agent/ui/components/card';
import { Input } from '@bookeeping-agent/ui/components/input';
import { Label } from '@bookeeping-agent/ui/components/label';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '../lib/auth-client';
import { getSession } from '../lib/auth-functions';

const seededUsernames = new Set(['alice', 'bob', 'charlie']);

function usernameToEmail(username: string) {
	return `${username}@bookkeeping.local`;
}

export const Route = createFileRoute('/login')({
	beforeLoad: async () => {
		const session = await getSession();

		if (session) {
			throw redirect({ to: '/expenses' });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [username, setUsername] = useState('alice');
	const [password, setPassword] = useState('alicepassword');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const normalizedUsername = username.trim().toLowerCase();

		if (!seededUsernames.has(normalizedUsername)) {
			toast.error('Use alice, bob, or charlie.');
			return;
		}

		setIsSubmitting(true);

		try {
			const result = await authClient.signIn.email({
				email: usernameToEmail(normalizedUsername),
				password,
			});

			if (result.error) {
				toast.error(result.error.message || 'Could not sign in');
				return;
			}

			await navigate({ to: '/expenses' });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="grid min-h-0 place-items-center overflow-auto px-4 py-10 md:px-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-xl normal-case tracking-tight">
						Sign in
					</CardTitle>
					<CardDescription>
						Use alice, bob, or charlie. Passwords are namepassword.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="grid gap-5" onSubmit={handleSubmit}>
						<div className="grid gap-2">
							<Label htmlFor="username">Username</Label>
							<Input
								autoComplete="username"
								autoFocus
								id="username"
								onChange={(event) => setUsername(event.currentTarget.value)}
								value={username}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								autoComplete="current-password"
								id="password"
								onChange={(event) => setPassword(event.currentTarget.value)}
								type="password"
								value={password}
							/>
						</div>
						<Button disabled={isSubmitting} type="submit">
							{isSubmitting ? 'Signing in…' : 'Sign in'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
