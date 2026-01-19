import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'dart:typed_data';
import 'dart:io';
import 'package:image_picker/image_picker.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );
  runApp(const App());
}

typedef LoadingHandle = void Function();

class GlobalLoadingController extends ChangeNotifier {
  int _count = 0;
  String _message = 'Loading...';

  String get message => _message;
  bool get isLoading => _count > 0;

  LoadingHandle start([String? message]) {
    if (message != null && message.isNotEmpty) {
      _message = message;
    }
    _count += 1;
    notifyListeners();
    var stopped = false;
    return () {
      if (stopped) return;
      stopped = true;
      if (_count > 0) {
        _count -= 1;
      }
      if (_count == 0) {
        _message = 'Loading...';
      }
      notifyListeners();
    };
  }

  void updateMessage(String message) {
    if (!isLoading) return;
    _message = message;
    notifyListeners();
  }
}

class GlobalLoadingScope extends InheritedNotifier<GlobalLoadingController> {
  const GlobalLoadingScope({
    super.key,
    required GlobalLoadingController controller,
    required super.child,
  }) : super(notifier: controller);

  static GlobalLoadingController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<GlobalLoadingScope>();
    final controller = scope?.notifier;
    if (controller == null) {
      throw StateError('GlobalLoadingScope not found');
    }
    return controller;
  }
}

class _GlobalLoadingOverlay extends StatelessWidget {
  const _GlobalLoadingOverlay({required this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final controller = GlobalLoadingScope.of(context);
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final content = child ?? const SizedBox.shrink();
        if (!controller.isLoading) {
          return content;
        }
        return Stack(
          children: [
            content,
            Positioned.fill(
              child: Stack(
                children: [
                  const ModalBarrier(
                    dismissible: false,
                    color: Colors.black54,
                  ),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.black87,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(
                            height: 28,
                            width: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 3,
                              valueColor: AlwaysStoppedAnimation(Colors.orangeAccent),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            controller.message,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class App extends StatefulWidget {
  const App({super.key});

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  final GlobalLoadingController _globalLoading = GlobalLoadingController();

  bool _isAdminish() {
    final role =
        Supabase.instance.client.auth.currentUser?.appMetadata['role'] as String?;
    return role == 'admin' || role == 'reviewer';
  }

  @override
  void dispose() {
    _globalLoading.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final client = Supabase.instance.client;
    final router = GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
        GoRoute(path: '/home', builder: (_, __) => HomePage(isAdmin: _isAdminish())),
        GoRoute(path: '/registration', builder: (_, __) => const RegistrationFormPage()),
        GoRoute(
          path: '/admin/list',
          builder: (_, __) => const AdminListPage(),
        ),
        GoRoute(
          path: '/admin/detail/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return AdminDetailPage(id: id);
          },
        ),
      ],
      redirect: (ctx, state) {
        final session = client.auth.currentSession;
        final loggingIn = state.fullPath == '/login';
        if (session == null && !loggingIn) return '/login';
        if (session != null && loggingIn) return '/home';
        return null;
      },
      refreshListenable:
          GoRouterRefreshStream(client.auth.onAuthStateChange.map((event) => event.session)),
    );

    return GlobalLoadingScope(
      controller: _globalLoading,
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        title: 'Pilgrimage',
        theme: ThemeData(
          useMaterial3: true,
          colorSchemeSeed: Colors.indigo,
          inputDecorationTheme: const InputDecorationTheme(
            border: OutlineInputBorder(),
            isDense: true,
          ),
        ),
        routerConfig: router,
        builder: (context, child) => _GlobalLoadingOverlay(child: child),
      ),
    );
  }
}

class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }
  late final StreamSubscription<dynamic> _subscription;
  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController(text: 'admin@admin.com');
  final _password = TextEditingController(text: '12345678');
  String? _error;
  bool _loading = false;
  Uint8List? _bg;

  @override
  void initState() {
    super.initState();
    _loadBg();
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _loadBg() async {
    try {
      final data = await rootBundle.load('assets/images/web-bg.png');
      if (!mounted) return;
      setState(() {
        _bg = data.buffer.asUint8List();
      });
    } catch (_) {
      // ignore if missing
    }
  }

  Future<void> _login() async {
    if (_loading) return;
    final loading = GlobalLoadingScope.of(context);
    final stopLoading = loading.start('Signing in...');
    setState(() {
      _error = null;
      _loading = true;
    });
    final supabase = Supabase.instance.client;
    try {
      await supabase.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
      if (!mounted) return;
      loading.updateMessage('Loading home...');
      context.go('/home');
    } on AuthException catch (e) {
      if (mounted) {
        setState(() => _error = e.message);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Login failed: $e');
      }
    } finally {
      stopLoading();
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: _bg != null
            ? BoxDecoration(
                image: DecorationImage(
                  image: MemoryImage(_bg!),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(
                    Colors.black.withValues(alpha: 0.55),
                    BlendMode.darken,
                  ),
                ),
              )
            : const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xff0f172a), Color(0xff0b2d3f)],
                ),
              ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.temple_hindu, color: Colors.orangeAccent, size: 32),
                      SizedBox(width: 8),
                      Text(
                        'Pilgrimage Admin',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Sign in to manage yatri registrations',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white10),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 20,
                          offset: Offset(0, 10),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      children: [
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: 'Email',
                            labelStyle: const TextStyle(color: Colors.white70),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Colors.white24),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Colors.orangeAccent),
                            ),
                            filled: true,
                            fillColor: Colors.white.withValues(alpha: 0.05),
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: _password,
                          obscureText: true,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            labelStyle: const TextStyle(color: Colors.white70),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Colors.white24),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Colors.orangeAccent),
                            ),
                            filled: true,
                            fillColor: Colors.white.withValues(alpha: 0.05),
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Text(
                              _error!,
                              style: const TextStyle(color: Colors.redAccent),
                            ),
                          ),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              backgroundColor: Colors.orangeAccent,
                              foregroundColor: Colors.black87,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: _loading ? null : _login,
                            child: _loading
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation(Colors.black87),
                                    ),
                                  )
                                : const Text(
                                    'Sign in',
                                    style: TextStyle(fontWeight: FontWeight.w700),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Seeded: admin@admin.com / 12345678',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white60, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key, required this.isAdmin});
  final bool isAdmin;

  String _roleLabel() {
    final role =
        Supabase.instance.client.auth.currentUser?.appMetadata['role'] as String?;
    return role ?? 'yatri';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Pilgrimage Home', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: () async {
              await Supabase.instance.client.auth.signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                image: DecorationImage(
                  image: const AssetImage('assets/images/banner.png'),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(
                    Colors.black.withValues(alpha: 0.45),
                    BlendMode.darken,
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 16),
                  Text(
                    'Welcome (${_roleLabel()})',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: const [
                      _MetricCard(label: 'Submitted', value: '—', icon: Icons.edit_note),
                      _MetricCard(label: 'Needs review', value: '—', icon: Icons.search),
                      _MetricCard(label: 'Approved', value: '—', icon: Icons.check_circle_outline),
                      _MetricCard(label: 'Rejected', value: '—', icon: Icons.cancel_outlined),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white10),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 20,
                          offset: Offset(0, 10),
                        )
                      ],
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.orangeAccent,
                            foregroundColor: Colors.black87,
                            padding:
                                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          icon: const Icon(Icons.add),
                          label: const Text(
                            'Create Registration',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          onPressed: () => context.go('/registration'),
                        ),
                        if (isAdmin)
                          FilledButton.icon(
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.white.withValues(alpha: 0.12),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: const Icon(Icons.admin_panel_settings),
                            label: const Text(
                              'Admin',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                            onPressed: () => context.go('/admin/list'),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value, required this.icon});
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 28,
                width: 28,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: Colors.white70),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class RegistrationFormPage extends StatefulWidget {
  const RegistrationFormPage({super.key});

  @override
  State<RegistrationFormPage> createState() => _RegistrationFormPageState();
}

class _RegistrationFormPageState extends State<RegistrationFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _receiptNo = TextEditingController();
  final _name = TextEditingController();
  final _father = TextEditingController();
  final _address = TextEditingController();
  final _aadhaar = TextEditingController();
  final _phone = TextEditingController();
  final _whatsapp = TextEditingController();
  final _dob = TextEditingController();
  final _ageYears = TextEditingController();
  final _heightCm = TextEditingController();
  final _weightKg = TextEditingController();
  final _trainClass = TextEditingController();
  final _healthHeartMeds = TextEditingController();
  final _healthBpMeds = TextEditingController();
  final _healthDiabetesMeds = TextEditingController();
  final _healthAsthmaMeds = TextEditingController();
  final _healthOther = TextEditingController();
  final _healthOtherMeds = TextEditingController();
  final _emergencyName = TextEditingController();
  final _emergencyFather = TextEditingController();
  final _emergencyAge = TextEditingController();
  final _emergencyAddress = TextEditingController();
  final _emergencyPhone = TextEditingController();

  bool _healthHeart = false;
  bool _healthBp = false;
  bool _healthDiabetes = false;
  bool _healthAsthma = false;
  bool _otherActive = false;
  String _travelMode = 'train';
  String _reservationBy = 'self';
  bool _attendedBadarinath2024 = false;
  bool _sadhuSantCategory = false;
  bool _declarationAccepted = false;
  String? _message;
  bool _busy = false;
  XFile? _formImage;
  bool _extracting = false;
  final ImagePicker _picker = ImagePicker();

  @override
  void dispose() {
    _receiptNo.dispose();
    _name.dispose();
    _father.dispose();
    _address.dispose();
    _aadhaar.dispose();
    _phone.dispose();
    _whatsapp.dispose();
    _dob.dispose();
    _ageYears.dispose();
    _heightCm.dispose();
    _weightKg.dispose();
    _trainClass.dispose();
    _healthHeartMeds.dispose();
    _healthBpMeds.dispose();
    _healthDiabetesMeds.dispose();
    _healthAsthmaMeds.dispose();
    _healthOther.dispose();
    _healthOtherMeds.dispose();
    _emergencyName.dispose();
    _emergencyFather.dispose();
    _emergencyAge.dispose();
    _emergencyAddress.dispose();
    _emergencyPhone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    if (!_formKey.currentState!.validate()) return;
    if (!_declarationAccepted) {
      if (mounted) {
        setState(() {
          _message = 'Please accept the declaration to submit.';
        });
      }
      return;
    }

    final loading = GlobalLoadingScope.of(context);
    final stopLoading = loading.start('Creating registration...');
    if (mounted) {
      setState(() {
        _busy = true;
        _message = 'Creating registration...';
      });
    }

    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;
      if (user == null) {
        if (mounted) context.go('/login');
        return;
      }

      // Step 1: create registration first
      late final String registrationId;
      final signedAtIso = DateTime.now().toIso8601String();
      final hasOtherCondition = _otherActive && _healthOther.text.trim().isNotEmpty;
      final healthNone =
          !(_healthHeart || _healthBp || _healthDiabetes || _healthAsthma || hasOtherCondition);
      final healthHeartValue = healthNone ? false : _healthHeart;
      final healthBpValue = healthNone ? false : _healthBp;
      final healthDiabetesValue = healthNone ? false : _healthDiabetes;
      final healthAsthmaValue = healthNone ? false : _healthAsthma;
      final healthOtherValue = healthNone
          ? null
          : hasOtherCondition
              ? _healthOther.text.trim()
              : null;
      try {
        final result = await supabase.rpc('fn_create_registration', params: {
          'p_owner': user.id,
          'p_created_by': user.id,
          'p_name_hi': _name.text.trim(),
          'p_address_hi': _address.text.trim(),
          'p_phone': _phone.text.trim(),
          'p_declaration_accepted': _declarationAccepted,
          'p_declaration_signed_at': signedAtIso,
          'p_health_none': healthNone,
          'p_health_heart': healthHeartValue,
          'p_health_bp': healthBpValue,
          'p_health_diabetes': healthDiabetesValue,
          'p_health_asthma': healthAsthmaValue,
          'p_health_other': healthOtherValue,
        });
        final createdId = result as String?;
        if (createdId == null) {
          throw Exception('Registration id missing');
        }
        registrationId = createdId;
      } on PostgrestException catch (e) {
        if (mounted) {
          setState(() {
            _message = e.message;
          });
        }
        return;
      } catch (e) {
        if (mounted) {
          setState(() {
            _message = 'Could not create registration: $e';
          });
        }
        return;
      }

      // Step 2: upload form image if present
      String? formImagePath;
      bool uploadFailed = false;
      if (_formImage != null) {
        loading.updateMessage('Uploading form image...');
        if (mounted) {
          setState(() {
            _message = 'Uploading form image...';
          });
        }
        try {
          final bytes = await File(_formImage!.path).readAsBytes();
          final path = 'forms/registrations/$registrationId/form.jpg';
          await supabase.storage.from('forms').uploadBinary(
                path,
                bytes,
                fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true),
              );
          formImagePath = path;
        } on PostgrestException catch (e) {
          uploadFailed = true;
          if (mounted) {
            setState(() {
              _message = 'Image upload failed (registration saved): ${e.message}';
            });
          }
        } catch (e) {
          uploadFailed = true;
          if (mounted) {
            setState(() {
              _message = 'Image upload failed (registration saved): $e';
            });
          }
        }
      }

      loading.updateMessage('Saving details...');
      if (mounted) {
        setState(() {
          _message = 'Saving details...';
        });
      }

      final patch = {
        'receipt_no': _receiptNo.text.trim().isEmpty ? null : _receiptNo.text.trim(),
        'name_hi': _name.text.trim(),
        'father_name_hi': _father.text.trim().isEmpty ? null : _father.text.trim(),
        'address_hi': _address.text.trim(),
        'aadhaar_no': _aadhaar.text.trim().isEmpty ? null : _aadhaar.text.trim(),
        'phone': _phone.text.trim(),
        'whatsapp': _whatsapp.text.trim().isEmpty ? null : _whatsapp.text.trim(),
        'dob': _dob.text.trim().isEmpty ? null : _dob.text.trim(),
        'age_years': _ageYears.text.trim().isEmpty ? null : int.tryParse(_ageYears.text.trim()),
        'height_cm': _heightCm.text.trim().isEmpty ? null : double.tryParse(_heightCm.text.trim()),
        'weight_kg': _weightKg.text.trim().isEmpty ? null : double.tryParse(_weightKg.text.trim()),
        'travel_mode': _travelMode,
        'train_class': _trainClass.text.trim().isEmpty ? null : _trainClass.text.trim(),
        'reservation_by': _reservationBy.isEmpty ? null : _reservationBy,
        'health_none': healthNone,
        'health_heart': healthHeartValue,
        'health_heart_meds': healthHeartValue
            ? (_healthHeartMeds.text.trim().isEmpty ? null : _healthHeartMeds.text.trim())
            : null,
        'health_bp': healthBpValue,
        'health_bp_meds':
            healthBpValue ? (_healthBpMeds.text.trim().isEmpty ? null : _healthBpMeds.text.trim()) : null,
        'health_diabetes': healthDiabetesValue,
        'health_diabetes_meds': healthDiabetesValue
            ? (_healthDiabetesMeds.text.trim().isEmpty ? null : _healthDiabetesMeds.text.trim())
            : null,
        'health_asthma': healthAsthmaValue,
        'health_asthma_meds': healthAsthmaValue
            ? (_healthAsthmaMeds.text.trim().isEmpty ? null : _healthAsthmaMeds.text.trim())
            : null,
        'health_other': healthOtherValue,
        'health_other_meds': healthOtherValue != null
            ? (_healthOtherMeds.text.trim().isEmpty ? null : _healthOtherMeds.text.trim())
            : null,
        'emergency_contact_name':
            _emergencyName.text.trim().isEmpty ? null : _emergencyName.text.trim(),
        'emergency_contact_father_name':
            _emergencyFather.text.trim().isEmpty ? null : _emergencyFather.text.trim(),
        'emergency_contact_age_years':
            _emergencyAge.text.trim().isEmpty ? null : int.tryParse(_emergencyAge.text.trim()),
        'emergency_contact_address':
            _emergencyAddress.text.trim().isEmpty ? null : _emergencyAddress.text.trim(),
        'emergency_contact_phone':
            _emergencyPhone.text.trim().isEmpty ? null : _emergencyPhone.text.trim(),
        'attended_badarinath_2024': _attendedBadarinath2024,
        'sadhu_sant_category': _sadhuSantCategory,
        'declaration_accepted': _declarationAccepted,
        'declaration_signed_at': signedAtIso,
        'form_image_url': formImagePath,
        'status': 'submitted',
      };

      try {
        await supabase.rpc('fn_update_registration', params: {
          'p_id': registrationId,
          'p_patch': patch,
        });
        if (mounted) {
          setState(() {
            _message = uploadFailed
                ? 'Registration submitted; form image upload failed.'
                : formImagePath != null
                    ? 'Registration submitted with form image.'
                    : 'Registration submitted (no form image uploaded).';
          });
        }
      } on PostgrestException catch (e) {
        if (mounted) {
          setState(() {
            _message = 'Registration saved but details update failed: ${e.message}';
          });
        }
      } catch (e) {
        if (mounted) {
          setState(() {
            _message = 'Registration saved but details update failed: $e';
          });
        }
      }
    } finally {
      stopLoading();
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _captureFormImage() async {
    try {
      final picked = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
      if (!mounted) return;
      if (picked != null) {
        setState(() => _formImage = picked);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not capture image: $e')),
        );
      }
    }
  }

  Future<void> _mockExtractAndFill() async {
    if (_formImage == null) return;
    setState(() {
      _extracting = true;
    });
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    setState(() {
      _name.text = _name.text.isEmpty ? 'राम कुमार' : _name.text;
      _address.text = _address.text.isEmpty ? 'पुरी, ओडिशा' : _address.text;
      _phone.text = _phone.text.isEmpty ? '+919812345678' : _phone.text;
      _aadhaar.text = _aadhaar.text.isEmpty ? '123456789012' : _aadhaar.text;
      _ageYears.text = _ageYears.text.isEmpty ? '45' : _ageYears.text;
      _heightCm.text = _heightCm.text.isEmpty ? '170' : _heightCm.text;
      _weightKg.text = _weightKg.text.isEmpty ? '70' : _weightKg.text;
      _travelMode = 'train';
      _healthBp = true;
      _healthBpMeds.text = _healthBpMeds.text.isEmpty ? 'Amlodipine' : _healthBpMeds.text;
      _declarationAccepted = true;
      _extracting = false;
      _message = 'Extracted sample data from form image (mock).';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          'Manual Registration',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.orangeAccent),
                foregroundColor: Colors.orangeAccent,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _captureFormImage,
              icon: const Icon(Icons.camera_alt_outlined, size: 18),
              label: const Text('Form Photo', style: TextStyle(fontSize: 12)),
            ),
          ),
        ],
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/images/banner.png'),
            fit: BoxFit.cover,
            colorFilter: ColorFilter.mode(Colors.black.withValues(alpha: 0.65), BlendMode.darken),
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  if (_formImage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white24),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.file(
                              File(_formImage!.path),
                              fit: BoxFit.cover,
                              height: 180,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton.icon(
                            onPressed: _extracting ? null : _mockExtractAndFill,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.orangeAccent,
                              foregroundColor: Colors.black,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: _extracting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation(Colors.black87),
                                    ),
                                  )
                                : const Icon(Icons.auto_fix_high_outlined),
                            label: Text(_extracting ? 'Extracting...' : 'Extract & Fill (mock)'),
                          ),
                        ],
                      ),
                    ),
                  _buildTextField(
                    controller: _receiptNo,
                    label: 'Receipt No.',
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _name,
                    label: 'Name (Hindi allowed)',
                    validator: (v) => v == null || v.trim().isEmpty ? 'Name is required' : null,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _father,
                    label: 'Father/Guardian',
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _aadhaar,
                    label: 'Aadhaar',
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _address,
                    label: 'Address',
                    maxLines: 2,
                    validator: (v) => v == null || v.trim().isEmpty ? 'Address is required' : null,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _phone,
                    label: 'Phone',
                    keyboard: TextInputType.phone,
                    validator: (v) => v == null || v.trim().isEmpty ? 'Phone is required' : null,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _whatsapp,
                    label: 'WhatsApp',
                    keyboard: TextInputType.phone,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _dob,
                    label: 'Date of Birth (YYYY-MM-DD)',
                    keyboard: TextInputType.datetime,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _ageYears,
                    label: 'Age (years)',
                    keyboard: TextInputType.number,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _heightCm,
                    label: 'Height (cm)',
                    keyboard: TextInputType.number,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _weightKg,
                    label: 'Weight (kg)',
                    keyboard: TextInputType.number,
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    initialValue: _travelMode,
                    dropdownColor: const Color(0xff0f172a),
                    style: const TextStyle(color: Colors.white),
                    iconEnabledColor: Colors.white70,
                    decoration: _inputDecoration('Travel Mode'),
                    items: const [
                      DropdownMenuItem(
                        value: 'train',
                        child: Text('Train', style: TextStyle(color: Colors.white)),
                      ),
                      DropdownMenuItem(
                        value: 'air',
                        child: Text('Air', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                    onChanged: (v) => setState(() => _travelMode = v ?? 'train'),
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _trainClass,
                    label: 'Train Class (II AC, III AC, etc)',
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: _reservationBy,
                    dropdownColor: const Color(0xff0f172a),
                    style: const TextStyle(color: Colors.white),
                    iconEnabledColor: Colors.white70,
                    decoration: _inputDecoration('Reservation By'),
                    items: const [
                      DropdownMenuItem(
                        value: 'self',
                        child: Text('Self', style: TextStyle(color: Colors.white)),
                      ),
                      DropdownMenuItem(
                        value: 'committee',
                        child: Text('Committee', style: TextStyle(color: Colors.white)),
                      ),
                      DropdownMenuItem(
                        value: '',
                        child: Text('Not set', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                    onChanged: (v) => setState(() => _reservationBy = v ?? ''),
                  ),
                  const SizedBox(height: 6),
                  SwitchListTile(
                    title: const Text('Health: Heart', style: TextStyle(color: Colors.white)),
                    value: _healthHeart,
                    thumbColor: _activeColor(Colors.orangeAccent),
                    trackColor: _activeColor(Colors.orangeAccent.withValues(alpha: 0.4), inactive: Colors.white24.withValues(alpha: 0.2)),
                    subtitle: _buildTextField(
                      controller: _healthHeartMeds,
                      label: 'Heart medicines / notes',
                      enabled: _healthHeart,
                    ),
                    onChanged: (v) {
                      setState(() {
                        _healthHeart = v;
                        if (!v) _healthHeartMeds.clear();
                      });
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Health: BP', style: TextStyle(color: Colors.white)),
                    value: _healthBp,
                    thumbColor: _activeColor(Colors.orangeAccent),
                    trackColor: _activeColor(Colors.orangeAccent.withValues(alpha: 0.4), inactive: Colors.white24.withValues(alpha: 0.2)),
                    subtitle: _buildTextField(
                      controller: _healthBpMeds,
                      label: 'BP medicines / notes',
                      enabled: _healthBp,
                    ),
                    onChanged: (v) {
                      setState(() {
                        _healthBp = v;
                        if (!v) _healthBpMeds.clear();
                      });
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Health: Diabetes', style: TextStyle(color: Colors.white)),
                    value: _healthDiabetes,
                    thumbColor: _activeColor(Colors.orangeAccent),
                    trackColor: _activeColor(Colors.orangeAccent.withValues(alpha: 0.4), inactive: Colors.white24.withValues(alpha: 0.2)),
                    subtitle: _buildTextField(
                      controller: _healthDiabetesMeds,
                      label: 'Diabetes medicines / notes',
                      enabled: _healthDiabetes,
                    ),
                    onChanged: (v) {
                      setState(() {
                        _healthDiabetes = v;
                        if (!v) _healthDiabetesMeds.clear();
                      });
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Health: Asthma', style: TextStyle(color: Colors.white)),
                    value: _healthAsthma,
                    thumbColor: _activeColor(Colors.orangeAccent),
                    trackColor: _activeColor(Colors.orangeAccent.withValues(alpha: 0.4), inactive: Colors.white24.withValues(alpha: 0.2)),
                    subtitle: _buildTextField(
                      controller: _healthAsthmaMeds,
                      label: 'Asthma medicines / notes',
                      enabled: _healthAsthma,
                    ),
                    onChanged: (v) {
                      setState(() {
                        _healthAsthma = v;
                        if (!v) _healthAsthmaMeds.clear();
                      });
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Other condition', style: TextStyle(color: Colors.white)),
                    value: _otherActive,
                    thumbColor: _activeColor(Colors.orangeAccent),
                    trackColor: _activeColor(Colors.orangeAccent.withValues(alpha: 0.4), inactive: Colors.white24.withValues(alpha: 0.2)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildTextField(
                          controller: _healthOther,
                          label: 'Condition',
                          enabled: _otherActive,
                        ),
                        const SizedBox(height: 6),
                        _buildTextField(
                          controller: _healthOtherMeds,
                          label: 'Medicines / notes',
                          enabled: _otherActive,
                        ),
                      ],
                    ),
                    onChanged: (v) {
                      setState(() {
                        _otherActive = v;
                        if (!v) {
                          _healthOther.clear();
                          _healthOtherMeds.clear();
                        }
                      });
                    },
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _emergencyName,
                    label: 'Emergency Contact Name',
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _emergencyFather,
                    label: 'Emergency Contact Father/Guardian',
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _emergencyAge,
                    label: 'Emergency Contact Age',
                    keyboard: TextInputType.number,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _emergencyPhone,
                    label: 'Emergency Contact Phone',
                    keyboard: TextInputType.phone,
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _emergencyAddress,
                    label: 'Emergency Contact Address',
                    maxLines: 2,
                  ),
                  const SizedBox(height: 10),
                  CheckboxListTile(
                    value: _attendedBadarinath2024,
                    onChanged: (v) => setState(() => _attendedBadarinath2024 = v ?? false),
                    title: const Text('Attended Badarinath 2024', style: TextStyle(color: Colors.white)),
                    controlAffinity: ListTileControlAffinity.leading,
                    fillColor: _activeColor(Colors.orangeAccent),
                  ),
                  CheckboxListTile(
                    value: _sadhuSantCategory,
                    onChanged: (v) => setState(() => _sadhuSantCategory = v ?? false),
                    title: const Text('Sadhu/Sant category', style: TextStyle(color: Colors.white)),
                    controlAffinity: ListTileControlAffinity.leading,
                    fillColor: _activeColor(Colors.orangeAccent),
                  ),
                  CheckboxListTile(
                    value: _declarationAccepted,
                    onChanged: (v) => setState(() => _declarationAccepted = v ?? false),
                    title: const Text('I accept the declaration (required)', style: TextStyle(color: Colors.white)),
                    controlAffinity: ListTileControlAffinity.leading,
                    fillColor: _activeColor(Colors.orangeAccent),
                  ),
                  const SizedBox(height: 16),
                  if (_message != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        _message!,
                        style: const TextStyle(color: Colors.greenAccent),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: FilledButton(
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              backgroundColor: Colors.orangeAccent,
              foregroundColor: Colors.black87,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(Colors.black87),
                    ),
                  )
                : const Text(
                    'Submit',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
          ),
        ),
      ),
    );
  }

  WidgetStateProperty<Color?> _activeColor(Color active, {Color? inactive}) {
    return WidgetStateProperty.resolveWith(
      (states) => states.contains(WidgetState.selected) ? active : (inactive ?? Colors.white24),
    );
  }

  InputDecoration _inputDecoration(String label) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white70),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.white24),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.orangeAccent),
        ),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.08),
      );

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboard,
    int maxLines = 1,
    bool enabled = true,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboard,
      enabled: enabled,
      validator: validator,
      style: const TextStyle(color: Colors.white),
      decoration: _inputDecoration(label),
    );
  }
}

class AdminListPage extends StatefulWidget {
  const AdminListPage({super.key});

  @override
  State<AdminListPage> createState() => _AdminListPageState();
}

class _AdminListPageState extends State<AdminListPage> {
  late Future<List<Map<String, dynamic>>> _future;
  String _status = 'needs_review';

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Map<String, dynamic>>> _load() async {
    final client = Supabase.instance.client;
    final role = client.auth.currentUser?.appMetadata['role'] as String?;
    if (role != 'admin' && role != 'reviewer') {
      return [];
    }
    final response = _status.isNotEmpty
        ? await client
            .from('yatra_registrations')
            .select()
            .eq('status', _status)
            .order('created_at', ascending: false)
        : await client
            .from('yatra_registrations')
            .select()
            .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(response);
  }

  @override
  Widget build(BuildContext context) {
    final role = Supabase.instance.client.auth.currentUser?.appMetadata['role'] as String?;
    final isAdmin = role == 'admin' || role == 'reviewer';
    if (!isAdmin) {
      return const Scaffold(
        body: Center(child: Text('Admin/Reviewer only')),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin — Yatris'),
        actions: [
          IconButton(
            onPressed: () => setState(() => _future = _load()),
            icon: const Icon(Icons.refresh),
          )
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: DropdownButtonFormField<String>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Status'),
              items: const [
                DropdownMenuItem(value: '', child: Text('All')),
                DropdownMenuItem(value: 'needs_review', child: Text('Needs Review')),
                DropdownMenuItem(value: 'submitted', child: Text('Submitted')),
                DropdownMenuItem(value: 'approved', child: Text('Approved')),
                DropdownMenuItem(value: 'rejected', child: Text('Rejected')),
              ],
              onChanged: (v) {
                setState(() {
                  _status = v ?? '';
                  _future = _load();
                });
              },
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }
                final data = snapshot.data ?? [];
                if (data.isEmpty) {
                  return const Center(child: Text('No registrations found.'));
                }
                return ListView.builder(
                  itemCount: data.length,
                  itemBuilder: (context, index) {
                    final row = data[index];
                    return ListTile(
                      title: Text(row['name_hi'] ?? 'Unknown'),
                      subtitle: Text('${row['phone'] ?? ''} • ${row['status']}'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.go('/admin/detail/${row['id']}'),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class AdminDetailPage extends StatelessWidget {
  const AdminDetailPage({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: Supabase.instance.client
          .from('yatra_registrations')
          .select()
          .eq('id', id)
          .limit(1),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.hasError || (snapshot.data ?? []).isEmpty) {
          return Scaffold(
            appBar: AppBar(title: const Text('Registration Detail')),
            body: Center(child: Text('Unable to load registration')),
          );
        }
        final reg = snapshot.data!.first;
        String fmt(dynamic value) {
          if (value == null) return '—';
          if (value is String && value.trim().isEmpty) return '—';
          return value.toString();
        }
        return Scaffold(
          appBar: AppBar(title: const Text('Registration Detail')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                reg['name_hi'] ?? 'Unknown',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text('Receipt: ${fmt(reg['receipt_no'])}'),
              Text('Aadhaar: ${fmt(reg['aadhaar_no'])}'),
              Text('Father: ${fmt(reg['father_name_hi'])}'),
              const SizedBox(height: 8),
              Text('Address: ${fmt(reg['address_hi'])}'),
              Text('Phone: ${fmt(reg['phone'])}'),
              Text('WhatsApp: ${fmt(reg['whatsapp'])}'),
              Text('DOB: ${fmt(reg['dob'])}   Age: ${fmt(reg['age_years'])}'),
              Text('Height/Weight: ${fmt(reg['height_cm'])} cm / ${fmt(reg['weight_kg'])} kg'),
              Text('Travel: ${fmt(reg['travel_mode'])} (${fmt(reg['train_class'])})'),
              Text('Reservation By: ${fmt(reg['reservation_by'])}'),
              const Divider(),
              const Text('Medical', style: TextStyle(fontWeight: FontWeight.w600)),
              Text('Heart: ${reg['health_heart'] == true ? "Yes" : "No"} — Meds: ${fmt(reg['health_heart_meds'])}'),
              Text('BP: ${reg['health_bp'] == true ? "Yes" : "No"} — Meds: ${fmt(reg['health_bp_meds'])}'),
              Text('Diabetes: ${reg['health_diabetes'] == true ? "Yes" : "No"} — Meds: ${fmt(reg['health_diabetes_meds'])}'),
              Text('Asthma: ${reg['health_asthma'] == true ? "Yes" : "No"} — Meds: ${fmt(reg['health_asthma_meds'])}'),
              Text('Other: ${fmt(reg['health_other'])} — Meds: ${fmt(reg['health_other_meds'])}'),
              const Divider(),
              const Text('Emergency', style: TextStyle(fontWeight: FontWeight.w600)),
              Text('Name: ${fmt(reg['emergency_contact_name'])}'),
              Text('Father/Guardian: ${fmt(reg['emergency_contact_father_name'])}'),
              Text('Age: ${fmt(reg['emergency_contact_age_years'])}'),
              Text('Phone: ${fmt(reg['emergency_contact_phone'])}'),
              Text('Address: ${fmt(reg['emergency_contact_address'])}'),
              const Divider(),
              Text('Attended Badarinath 2024: ${reg['attended_badarinath_2024'] == true ? "Yes" : "No"}'),
              Text('Sadhu/Sant category: ${reg['sadhu_sant_category'] == true ? "Yes" : "No"}'),
              Text('Declaration: ${reg['declaration_accepted'] == true ? "Accepted" : "Pending"}'),
              Text('Signed at: ${fmt(reg['declaration_signed_at'])}'),
              Text('Form image: ${fmt(reg['form_image_url'])}'),
              Text('Photo: ${fmt(reg['photo_url'])}'),
              Text('Status: ${fmt(reg['status'])}'),
            ],
          ),
        );
      },
    );
  }
}
