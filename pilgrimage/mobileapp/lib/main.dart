import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:go_router/go_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    final supabase = Supabase.instance.client;
    final router = GoRouter(
      routes: [
        GoRoute(path: '/', builder: (_, __) => const Gate()),
        GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
        GoRoute(path: '/home', builder: (_, __) => const HomePage()),
        GoRoute(
          path: '/registration',
          builder: (_, __) => const RegistrationPage(),
        ),
      ],
      redirect: (ctx, state) {
        final session = supabase.auth.currentSession;
        final loggingIn = state.fullPath == '/login';
        if (session == null && !loggingIn) return '/login';
        if (session != null && loggingIn) return '/home';
        return null;
      },
      refreshListenable: SupabaseAuthState(supabase),
    );

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'Pilgrimage',
      routerConfig: router,
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
    );
  }
}

/// Tiny listenable to refresh router on auth changes
class SupabaseAuthState extends ChangeNotifier {
  SupabaseAuthState(SupabaseClient c) {
    c.auth.onAuthStateChange.listen((_) => notifyListeners());
  }
}

/// Splash gate
class Gate extends StatelessWidget {
  const Gate({super.key});
  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}

/// Email magic-link login
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  String? _msg;
  bool _busy = false;

  Future<void> _sendMagic() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    final supabase = Supabase.instance.client;
    try {
      await supabase.auth.signInWithOtp(
        email: _email.text.trim(),
        emailRedirectTo: 'io.supabase.flutter://login-callback/',
      );
      setState(() {
        _busy = false;
        _msg = 'Check your email for the magic link.';
      });
    } on AuthException catch (e) {
      setState(() {
        _busy = false;
        _msg = e.message;
      });
    } catch (e) {
      setState(() {
        _busy = false;
        _msg = 'Something went wrong: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _busy ? null : _sendMagic,
              child: _busy
                  ? const CircularProgressIndicator()
                  : const Text('Send magic link'),
            ),
            if (_msg != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_msg!),
              ),
          ],
        ),
      ),
    );
  }
}

/// Post-login home
class HomePage extends StatelessWidget {
  const HomePage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pilgrimage Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await Supabase.instance.client.auth.signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: Center(
        child: FilledButton(
          onPressed: () => context.go('/registration'),
          child: const Text('Create Registration'),
        ),
      ),
    );
  }
}

/// Very simple placeholder “Create Registration”
/// (stores just name + phone to test RLS and insert)
class RegistrationPage extends StatefulWidget {
  const RegistrationPage({super.key});
  @override
  State<RegistrationPage> createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  String? _msg;
  bool _busy = false;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    final supabase = Supabase.instance.client;
    try {
      final user = supabase.auth.currentUser!;
      final row = await supabase
          .from('yatra_registrations')
          .insert({
            'owner': user.id,
            'created_by': user.id,
            'name_hi': _name.text.trim(),
            'phone': _phone.text.trim(),
            'status': 'submitted',
          })
          .select('id')
          .single(); // returns the row

      setState(() {
        _busy = false;
        _msg = 'Created: ${row['id']}';
      });
    } on PostgrestException catch (e) {
      setState(() {
        _busy = false;
        _msg = e.message;
      });
    } catch (e) {
      setState(() {
        _busy = false;
        _msg = 'Something went wrong: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Registration')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _name,
              decoration: const InputDecoration(
                labelText: 'Name (Hindi allowed)',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _phone,
              decoration: const InputDecoration(labelText: 'Phone (+91...)'),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const CircularProgressIndicator()
                  : const Text('Submit'),
            ),
            if (_msg != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_msg!),
              ),
          ],
        ),
      ),
    );
  }
}
