import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AlertComponent } from '../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ListComponent, ListItem } from '../../shared/ui/list/list.component';
import { MessageBoxComponent } from '../../shared/ui/message-box/message-box.component';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';
import { AuthService } from '../../core/auth/auth.service';
import { reiniciarDatosDemo } from '../../mock/mock-db';
import { CONTRASENA_DEMO, USUARIOS_DEMO, USUARIOS_LOGIN } from '../../mock/usuarios-demo';

@Component({
  selector: 'siaf-login',
  standalone: true,
  imports: [AlertComponent, ButtonComponent, FormsModule, ListComponent, MessageBoxComponent, TextFieldComponent],
  template: `
    <main class="flex min-h-screen bg-[var(--sys-color-bg-surfaces-surface)] text-text lg:h-screen lg:overflow-hidden">
      <section class="hidden h-screen flex-[0_0_50%] overflow-hidden lg:block" aria-hidden="true">
        <img class="h-full w-full object-cover" src="assets/figma/login/login-hero.webp" alt="" />
      </section>

      <section class="flex min-h-screen flex-1 justify-center overflow-y-auto px-siaf-lg py-siaf-xxl lg:h-screen lg:min-h-0 lg:flex-[0_0_50%]">
        <div class="my-auto flex w-full max-w-[360px] flex-col items-center gap-12">

          <!-- Logos -->
          <header class="flex w-full flex-col items-center gap-siaf-lg">
            <img class="h-[53px] w-[250px] object-contain" src="assets/figma/login/mef-logo.webp" alt="Ministerio de Economia y Finanzas" />
            <img class="h-[54px] w-[174px] object-contain" src="assets/figma/login/siaf-logo-vector.svg" alt="SIAF-RP" />
          </header>

          <section class="flex w-full flex-col items-center gap-siaf-lg">

            <!-- Título (Figma «A.2-OA-EV-001-Login») -->
            <div class="flex w-full flex-col items-center gap-siaf-xs">
              <h1 class="m-0 text-[30px] font-bold leading-none tracking-[-0.63px] text-[var(--sys-color-text-brand-primary)]">Bienvenido</h1>
              <p class="m-0 text-sm font-medium leading-normal text-[var(--sys-color-text-neutral-medium)]">
                Ingresa tus datos para continuar
              </p>
            </div>

            <form class="flex w-full flex-col items-center gap-siaf-lg" aria-label="Inicio de sesión" (ngSubmit)="onSubmit()">
              <!-- Usuario: correo (o DNI) -->
              <siaf-input
                class="mt-siaf-xs block w-full"
                label="Usuario"
                type="text"
                leadingIcon="mail"
                autocomplete="username"
                [value]="usuario()"
                (valueChange)="usuario.set(textFieldValue($event))"
              />

              <!-- Contraseña y «Olvidé mi contraseña» -->
              <div class="flex w-full flex-col items-end gap-siaf-xs">
                <siaf-input
                  class="block w-full"
                  label="Contraseña"
                  [type]="showPassword() ? 'text' : 'password'"
                  leadingIcon="lock"
                  [trailingIcon]="showPassword() ? 'visibility_off' : 'visibility'"
                  [trailingButtonLabel]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  autocomplete="current-password"
                  [value]="contrasena()"
                  (valueChange)="contrasena.set(textFieldValue($event))"
                  (trailingAction)="togglePassword()"
                />
                <button
                  class="rounded-siaf-sm text-xs font-medium text-[var(--sys-color-text-brand-primary)] hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sys-color-border-states-focus)]"
                  type="button"
                  (click)="goToRecuperarContrasena()"
                >
                  Olvidé mi contraseña
                </button>
              </div>

              <!-- Error de autenticación -->
              @if (authService.authError()) {
                <p class="m-0 w-full rounded-siaf-sm bg-[var(--sys-color-bg-feedback-light-danger)] px-siaf-md py-siaf-xs text-sm text-[var(--sys-color-text-feedback-danger)]">
                  {{ authService.authError() }}
                </p>
              }

              <siaf-button
                class="mt-siaf-xs block w-full"
                variant="primary"
                type="submit"
                [disabled]="authService.isLoading()"
              >
                {{ authService.isLoading() ? 'Ingresando...' : 'Iniciar sesión' }}
              </siaf-button>

              <siaf-button variant="text" icon="home" (click)="irAInicio()">Ir a inicio</siaf-button>
            </form>

            <!-- Taller: usuarios de demostración (no está en el Figma; llena el usuario y la contraseña) -->
            <section class="mt-siaf-lg flex w-full flex-col gap-siaf-xs" aria-labelledby="usuarios-demo-titulo">
              <div class="flex items-center justify-between gap-siaf-xs">
                <h2 id="usuarios-demo-titulo" class="m-0 text-base font-bold text-[var(--sys-color-text-neutral-high)]">Usuarios de demostración</h2>
                <siaf-button variant="text" size="sm" icon="restart_alt" (click)="reiniciarDatos()">Reiniciar datos</siaf-button>
              </div>
              <siaf-list
                ariaLabel="Usuarios de demostración"
                [items]="usuariosDemo"
                [selectable]="true"
                [wrapDescription]="true"
                [dividers]="true"
                [selectedId]="usuarioElegido()"
                (selectedIdChange)="elegirUsuario($event)"
              />
              <message-box [text]="'Elija un usuario para llenar el correo. La contraseña de todos es ' + contrasenaDemo + '.'" />
              @if (datosReiniciados()) {
                <siaf-alert
                  tone="success"
                  description="Se restauraron las solicitudes, las cuentas y las notificaciones iniciales."
                  [showClose]="true"
                  (closed)="datosReiniciados.set(false)"
                />
              }
            </section>
          </section>
        </div>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly usuario = signal('');
  readonly contrasena = signal('');
  readonly showPassword = signal(false);

  // ── Taller: usuarios de demostración (src/app/mock/usuarios-demo.ts) ──
  readonly contrasenaDemo = CONTRASENA_DEMO;
  readonly usuariosDemo: ListItem[] = USUARIOS_LOGIN.map((id) => USUARIOS_DEMO.find((u) => u.id === id)!).map((u) => ({
    id: u.email,
    title: `${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`,
    description: `${u.email} · ${u.descripcion}`,
    leading: { type: 'avatar', initials: `${u.nombres[0]}${u.apellidoPaterno[0]}` },
  }));
  readonly usuarioElegido = signal<string | null>(null);
  readonly datosReiniciados = signal(false);

  onSubmit(): void {
    if (!this.usuario() || !this.contrasena()) return;
    this.authService.login(this.usuario().trim(), this.contrasena()).subscribe({
      next: () => void this.router.navigate(['/panel']),
    });
  }

  elegirUsuario(email: string): void {
    this.usuarioElegido.set(email);
    this.usuario.set(email);
    this.contrasena.set(CONTRASENA_DEMO);
  }

  /** Vuelve a los datos iniciales de la demo (lo que grabaron los usuarios se pierde). */
  reiniciarDatos(): void {
    reiniciarDatosDemo();
    this.datosReiniciados.set(true);
  }

  /** «Ir a inicio»: el escritorio virtual (sin sesión, el guard del armazón vuelve al login). */
  irAInicio(): void {
    void this.router.navigate(['/panel']);
  }

  goToRecuperarContrasena(): void {
    void this.router.navigate(['/login/recuperar-contrasena']);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  textFieldValue(value: string | number | string[]): string {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }
}
