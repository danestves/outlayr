import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const auth = {
    content: {
        "auth.adopt.body": t({
            en: "Choose what to keep. Only the first option keeps everything — the other two delete entries permanently.",
            es: "Elige qué quieres conservar. Solo la primera opción conserva todo; las otras dos borran entradas para siempre.",
            pt: "Escolha o que manter. Só a primeira opção mantém tudo; as outras duas apagam lançamentos para sempre.",
        }),
        "auth.adopt.confirm.cancel": t({
            en: "Keep both instead",
            es: "Mejor conservar los dos",
            pt: "Melhor manter os dois",
        }),
        "auth.adopt.confirm.keepAccount": t({
            en: "This phone's entries will be deleted and cannot be recovered. Your account's ledger is what remains.",
            es: "Las entradas de este celular se borrarán y no se podrán recuperar. Solo queda el registro de tu cuenta.",
            pt: "Os lançamentos deste celular serão apagados e não poderão ser recuperados. Só ficam os lançamentos da sua conta.",
        }),
        "auth.adopt.confirm.keepLocal": t({
            en: "Your account's entries will be deleted and cannot be recovered. This phone's ledger is what remains.",
            es: "Las entradas de tu cuenta se borrarán y no se podrán recuperar. Solo queda el registro de este celular.",
            pt: "Os lançamentos da sua conta serão apagados e não poderão ser recuperados. Só ficam os lançamentos deste celular.",
        }),
        "auth.adopt.confirm.proceed": t({
            en: "Delete and continue",
            es: "Borrar y continuar",
            pt: "Apagar e continuar",
        }),
        "auth.adopt.confirm.title": t({
            en: "This deletes entries",
            es: "Esto borra entradas",
            pt: "Isso apaga lançamentos",
        }),
        "auth.adopt.eyebrow": t({
            en: "Two ledgers",
            es: "Dos registros",
            pt: "Dois históricos",
        }),
        "auth.adopt.failed": t({
            en: "That could not be applied. Nothing was changed on either side — try again.",
            es: "No se pudo aplicar. No cambió nada en ningún lado. Inténtalo de nuevo.",
            pt: "Não foi possível aplicar. Nada mudou em nenhum dos lados. Tente de novo.",
        }),
        "auth.adopt.keepAccount.body": t({
            en: "Deletes every entry on this phone and replaces it with your account's ledger.",
            es: "Borra cada entrada de este celular y la reemplaza con el registro de tu cuenta.",
            pt: "Apaga todos os lançamentos deste celular e os substitui pelos da sua conta.",
        }),
        "auth.adopt.keepAccount.title": t({
            en: "Keep only the account's",
            es: "Conservar solo el de la cuenta",
            pt: "Manter só os da conta",
        }),
        "auth.adopt.keepLocal.body": t({
            en: "Deletes every entry your account holds and replaces it with this phone's ledger.",
            es: "Borra cada entrada que tiene tu cuenta y la reemplaza con el registro de este celular.",
            pt: "Apaga todos os lançamentos da sua conta e os substitui pelos deste celular.",
        }),
        "auth.adopt.keepLocal.title": t({
            en: "Keep only this phone's",
            es: "Conservar solo el de este celular",
            pt: "Manter só os deste celular",
        }),
        "auth.adopt.merge.body": t({
            en: "Every entry from this phone and from your account survives. Nothing is deleted. Duplicate categories are yours to tidy up afterwards.",
            es: "Se quedan todas las entradas de este celular y de tu cuenta. No se borra nada. Si quedan categorías duplicadas, puedes ordenarlas después.",
            pt: "Todos os lançamentos deste celular e da sua conta continuam. Nada é apagado. Se sobrarem categorias duplicadas, você pode arrumá-las depois.",
        }),
        "auth.adopt.merge.title": t({
            en: "Keep both",
            es: "Conservar los dos",
            pt: "Manter os dois",
        }),
        "auth.adopt.title": t({
            en: "This phone and your account both hold entries",
            es: "Este celular y tu cuenta tienen entradas",
            pt: "Este celular e sua conta têm lançamentos",
        }),
        "auth.adopt.working": t({
            en: "Reconciling…",
            es: "Conciliando…",
            pt: "Conciliando…",
        }),
        "auth.email.code": t({
            en: "Code",
            es: "Código",
            pt: "Código",
        }),
        "auth.email.continue": t({
            en: "Continue with email",
            es: "Continuar con correo",
            pt: "Continuar com e-mail",
        }),
        "auth.email.create": t({
            en: "New here? Create an account",
            es: "¿Eres nuevo? Crea una cuenta",
            pt: "Primeira vez aqui? Crie uma conta",
        }),
        "auth.email.create.action": t({
            en: "Create account",
            es: "Crear cuenta",
            pt: "Criar conta",
        }),
        "auth.email.create.title": t({
            en: "Create an account",
            es: "Crea una cuenta",
            pt: "Crie uma conta",
        }),
        "auth.email.email": t({
            en: "Email",
            es: "Correo",
            pt: "E-mail",
        }),
        "auth.email.error.attempts": t({
            en: "Too many tries with that code. Send a new one.",
            es: "Demasiados intentos con ese código. Pide uno nuevo.",
            pt: "Muitas tentativas com esse código. Peça um novo.",
        }),
        "auth.email.error.code": t({
            en: "That code is wrong or expired.",
            es: "Ese código no es válido o ya caducó.",
            pt: "Esse código está errado ou expirou.",
        }),
        "auth.email.error.credentials": t({
            en: "That email and password don't match.",
            es: "El correo y la contraseña no coinciden.",
            pt: "O e-mail e a senha não conferem.",
        }),
        "auth.email.error.email": t({
            en: "Enter a valid email.",
            es: "Escribe un correo válido.",
            pt: "Digite um e-mail válido.",
        }),
        "auth.email.error.rateLimited": t({
            en: "Too many tries. Wait a bit and try again.",
            es: "Demasiados intentos. Espera un poco y vuelve a intentarlo.",
            pt: "Muitas tentativas. Espere um pouco e tente de novo.",
        }),
        "auth.email.forgot": t({
            en: "Forgot password?",
            es: "¿Olvidaste tu contraseña?",
            pt: "Esqueceu a senha?",
        }),
        "auth.email.forgot.action": t({
            en: "Send code",
            es: "Enviar código",
            pt: "Enviar código",
        }),
        "auth.email.forgot.body": t({
            en: "We'll email you a code to set a new one.",
            es: "Te enviaremos un código para crear una nueva.",
            pt: "Vamos enviar um código por e-mail para você criar uma nova.",
        }),
        "auth.email.forgot.title": t({
            en: "Reset your password",
            es: "Restablece tu contraseña",
            pt: "Redefina sua senha",
        }),
        "auth.email.hidePassword": t({
            en: "Hide password",
            es: "Ocultar contraseña",
            pt: "Ocultar senha",
        }),
        "auth.email.newPassword": t({
            en: "New password",
            es: "Contraseña nueva",
            pt: "Nova senha",
        }),
        "auth.email.password": t({
            en: "Password",
            es: "Contraseña",
            pt: "Senha",
        }),
        "auth.email.passwordHint": t({
            en: "8 or more characters",
            es: "8 caracteres o más",
            pt: "8 caracteres ou mais",
        }),
        "auth.email.resend": t({
            en: "Send a new code",
            es: "Enviar un código nuevo",
            pt: "Enviar um novo código",
        }),
        "auth.email.resent": t({
            en: "New code sent.",
            es: "Código nuevo enviado.",
            pt: "Novo código enviado.",
        }),
        "auth.email.reset.action": t({
            en: "Set password",
            es: "Guardar contraseña",
            pt: "Definir senha",
        }),
        "auth.email.reset.body": t({
            en: "Enter the code we sent to {email} and choose a new password.",
            es: "Escribe el código que enviamos a {email} y elige una contraseña nueva.",
            pt: "Digite o código que enviamos para {email} e escolha uma nova senha.",
        }),
        "auth.email.showPassword": t({
            en: "Show password",
            es: "Mostrar contraseña",
            pt: "Mostrar senha",
        }),
        "auth.email.signIn.action": t({
            en: "Sign in",
            es: "Iniciar sesión",
            pt: "Entrar",
        }),
        "auth.email.signIn.title": t({
            en: "Sign in with email",
            es: "Inicia sesión con tu correo",
            pt: "Entre com seu e-mail",
        }),
        "auth.email.verify.action": t({
            en: "Verify",
            es: "Verificar",
            pt: "Verificar",
        }),
        "auth.email.verify.body": t({
            en: "Enter the code we sent to {email}.",
            es: "Escribe el código que enviamos a {email}.",
            pt: "Digite o código que enviamos para {email}.",
        }),
        "auth.email.verify.title": t({
            en: "Check your email",
            es: "Revisa tu correo",
            pt: "Confira seu e-mail",
        }),
        "auth.google.continue": t({
            en: "Continue with Google",
            es: "Continuar con Google",
            pt: "Continuar com o Google",
        }),
        "auth.restoring.title": t({
            en: "Opening your ledger",
            es: "Abriendo tu registro",
            pt: "Abrindo seus lançamentos",
        }),
        "auth.signIn.agreement": t({
            en: "By using Outlayr, you agree to the {terms} and {privacy}.",
            es: "Al usar Outlayr, aceptas los {terms} y la {privacy}.",
            pt: "Ao usar o Outlayr, você aceita os {terms} e a {privacy}.",
        }),
        "auth.signIn.begun": t({
            en: "Begun {date}.",
            es: "Comenzado el {date}.",
            pt: "Iniciado em {date}.",
        }),
        "auth.signIn.body": t({
            en: "Your ledger is on this phone and it stays there. An account means it survives losing the phone.",
            es: "Tu registro vive en este celular y ahí se queda. Con una cuenta, sobrevive aunque pierdas el celular.",
            pt: "Seus lançamentos estão neste celular e continuam aqui. Com uma conta, eles sobrevivem mesmo se você perder o celular.",
        }),
        "auth.signIn.eyebrow": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "auth.signIn.kept": t({
            en: "Kept in {currency}.",
            es: "Se lleva en {currency}.",
            pt: "Mantido em {currency}.",
        }),
        "auth.signIn.notNow": t({
            en: "Not now — open my ledger",
            es: "Ahora no, abrir mi registro",
            pt: "Agora não, abrir meus lançamentos",
        }),
        "auth.signIn.offline": t({
            en: "Signing in needs a connection. Once you have, your ledger opens offline.",
            es: "Para iniciar sesión necesitas conexión. Después, tu registro abre sin conexión.",
            pt: "Para entrar, você precisa de conexão. Depois disso, seus lançamentos abrem sem conexão.",
        }),
        "auth.signIn.pending": t({
            en: "Signing in…",
            es: "Iniciando sesión…",
            pt: "Entrando…",
        }),
        "auth.signIn.title": t({
            en: "Keep a copy of this?",
            es: "¿Quieres guardar una copia?",
            pt: "Quer manter uma cópia disso?",
        }),
        "auth.signIn.written": t({
            en: "Written daily at {time}.",
            es: "Se escribe a diario a las {time}.",
            pt: "Escrito todo dia às {time}.",
        }),
    },
    key: "auth" as const,
} satisfies Dictionary;

export default auth;
