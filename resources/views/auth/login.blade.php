<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Iniciar sesión — Rutas de Viaje</title>
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div class="flex items-center gap-3 mb-8">
            <div class="p-2.5 bg-amber-500 text-slate-950 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
            </div>
            <div>
                <h1 class="text-xl font-extrabold text-white">Rutas de Viaje</h1>
                <p class="text-xs text-slate-400">Inicia sesión para ver tus viajes</p>
            </div>
        </div>

        @if ($errors->any())
            <div class="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="{{ route('login') }}" class="space-y-4">
            @csrf
            <div>
                <label for="email" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" name="email" id="email" value="{{ old('email') }}" required autofocus
                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500 outline-none">
            </div>
            <div>
                <label for="password" class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
                <input type="password" name="password" id="password" required
                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500 outline-none">
            </div>
            <label class="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input type="checkbox" name="remember" class="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500">
                Recordarme
            </label>
            <button type="submit" class="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition">
                Entrar
            </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-500">
            ¿No tienes cuenta?
            <a href="{{ route('register') }}" class="text-amber-400 hover:text-amber-300 font-semibold">Regístrate</a>
        </p>
    </div>
</body>
</html>
