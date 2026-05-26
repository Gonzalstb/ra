<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Registro — Rutas de Viaje</title>
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div class="flex items-center gap-3 mb-8">
            <div class="p-2.5 bg-amber-500 text-slate-950 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            </div>
            <div>
                <h1 class="text-xl font-extrabold text-white">Crear cuenta</h1>
                <p class="text-xs text-slate-400">Tus viajes se guardarán en tu perfil</p>
            </div>
        </div>

        @if ($errors->any())
            <ul class="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm space-y-1">
                @foreach ($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        @endif

        <form method="POST" action="{{ route('register') }}" class="space-y-4">
            @csrf
            <div>
                <label for="name" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre</label>
                <input type="text" name="name" id="name" value="{{ old('name') }}" required autofocus
                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500 outline-none">
            </div>
            <div>
                <label for="email" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" name="email" id="email" value="{{ old('email') }}" required
                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500 outline-none">
            </div>
            <div>
                <label for="password" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
                <input type="password" name="password" id="password" required minlength="8"
                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500 outline-none">
            </div>
            <div>
                <label for="password_confirmation" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
                <input type="password" name="password_confirmation" id="password_confirmation" required
                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500 outline-none">
            </div>
            <button type="submit" class="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition">
                Registrarme
            </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?
            <a href="{{ route('login') }}" class="text-amber-400 hover:text-amber-300 font-semibold">Inicia sesión</a>
        </p>
    </div>
</body>
</html>
