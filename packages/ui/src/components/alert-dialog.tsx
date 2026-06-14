import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { cn } from '@bookeeping-agent/ui/lib/utils';
import type * as React from 'react';

import { buttonVariants } from './button';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogCancel = AlertDialogPrimitive.Close;
const AlertDialogAction = AlertDialogPrimitive.Close;

function AlertDialogPortal(props: AlertDialogPrimitive.Portal.Props) {
	return (
		<AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
	);
}

function AlertDialogBackdrop({
	className,
	...props
}: AlertDialogPrimitive.Backdrop.Props) {
	return (
		<AlertDialogPrimitive.Backdrop
			className={cn(
				'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-150 data-closed:opacity-0 data-open:opacity-100',
				className
			)}
			data-slot="alert-dialog-backdrop"
			{...props}
		/>
	);
}

function AlertDialogContent({
	className,
	children,
	...props
}: AlertDialogPrimitive.Popup.Props) {
	return (
		<AlertDialogPortal>
			<AlertDialogBackdrop />
			<AlertDialogPrimitive.Popup
				className={cn(
					'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 border bg-popover p-6 text-popover-foreground shadow-lg outline-none duration-150 data-closed:scale-98 data-open:scale-100 data-closed:opacity-0 data-open:opacity-100',
					className
				)}
				data-slot="alert-dialog-content"
				{...props}
			>
				{children}
			</AlertDialogPrimitive.Popup>
		</AlertDialogPortal>
	);
}

function AlertDialogHeader({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex flex-col gap-1.5 text-left', className)}
			data-slot="alert-dialog-header"
			{...props}
		/>
	);
}

function AlertDialogFooter({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
				className
			)}
			data-slot="alert-dialog-footer"
			{...props}
		/>
	);
}

function AlertDialogTitle({
	className,
	...props
}: AlertDialogPrimitive.Title.Props) {
	return (
		<AlertDialogPrimitive.Title
			className={cn('font-semibold text-lg tracking-tight', className)}
			data-slot="alert-dialog-title"
			{...props}
		/>
	);
}

function AlertDialogDescription({
	className,
	...props
}: AlertDialogPrimitive.Description.Props) {
	return (
		<AlertDialogPrimitive.Description
			className={cn('text-muted-foreground text-sm leading-relaxed', className)}
			data-slot="alert-dialog-description"
			{...props}
		/>
	);
}

function AlertDialogCancelButton({
	className,
	...props
}: AlertDialogPrimitive.Close.Props) {
	return (
		<AlertDialogPrimitive.Close
			className={cn(buttonVariants({ variant: 'outline' }), className)}
			data-slot="alert-dialog-cancel"
			{...props}
		/>
	);
}

function AlertDialogActionButton({
	className,
	...props
}: AlertDialogPrimitive.Close.Props) {
	return (
		<AlertDialogPrimitive.Close
			className={cn(buttonVariants({ variant: 'destructive' }), className)}
			data-slot="alert-dialog-action"
			{...props}
		/>
	);
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogActionButton,
	AlertDialogBackdrop,
	AlertDialogCancel,
	AlertDialogCancelButton,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger,
};
