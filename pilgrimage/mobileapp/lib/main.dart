import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:postgrest/postgrest.dart';
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

class App extends StatelessWidget {
  const App({super.key});

  bool _isAdminish() {
    final role =
        Supabase.instance.client.auth.currentUser?.appMetadata['role'] as String?;
    return role == 'admin' || role == 'reviewer';
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

    return MaterialApp.router(
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

  Future<void> _loadBg() async {
    try {
      final data = await rootBundle.load('assets/images/web-bg.png');
      setState(() {
        _bg = data.buffer.asUint8List();
      });
    } catch (_) {
      // ignore if missing
    }
  }

  Future<void> _login() async {
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
      if (mounted) context.go('/home');
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Login failed: $e');
    } finally {
      setState(() => _loading = false);
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
                    Colors.black.withOpacity(0.55),
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
                      color: Colors.white.withOpacity(0.08),
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
                            fillColor: Colors.white.withOpacity(0.05),
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
                            fillColor: Colors.white.withOpacity(0.05),
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
                    Colors.black.withOpacity(0.45),
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
                      color: Colors.white.withOpacity(0.08),
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
                              backgroundColor: Colors.white.withOpacity(0.12),
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
        color: Colors.white.withOpacity(0.06),
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
                  color: Colors.white.withOpacity(0.1),
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
  final _name = TextEditingController();
  final _father = TextEditingController();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  final _whatsapp = TextEditingController();
  final _trainClass = TextEditingController();
  final _healthOther = TextEditingController();
  final _emergencyName = TextEditingController();
  final _emergencyPhone = TextEditingController();

  bool _healthBp = false;
  bool _healthDiabetes = false;
  String _travelMode = 'train';
  String? _message;
  bool _busy = false;
  XFile? _formImage;
  bool _extracting = false;
  final ImagePicker _picker = ImagePicker();

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    final supabase = Supabase.instance.client;
    final user = supabase.auth.currentUser;
    if (user == null) {
      if (mounted) context.go('/login');
      return;
    }

    String? formImagePath;
    if (_formImage != null) {
      try {
        final bytes = await File(_formImage!.path).readAsBytes();
        final path =
            'forms/${user.id}/${DateTime.now().millisecondsSinceEpoch}.jpg';
        await supabase.storage.from('forms').uploadBinary(
              path,
              bytes,
              fileOptions: const FileOptions(contentType: 'image/jpeg'),
            );
        formImagePath = path;
      } catch (e) {
        setState(() {
          _message = 'Image upload failed: $e';
        });
      }
    }

    final payload = {
      'owner': user.id,
      'created_by': user.id,
      'name_hi': _name.text.trim(),
      'father_name_hi': _father.text.trim().isEmpty ? null : _father.text.trim(),
      'address_hi': _address.text.trim(),
      'phone': _phone.text.trim(),
      'whatsapp': _whatsapp.text.trim(),
      'travel_mode': _travelMode,
      'train_class': _trainClass.text.trim(),
      'health_bp': _healthBp,
      'health_diabetes': _healthDiabetes,
      'health_other': _healthOther.text.trim(),
      'emergency_contact_name': _emergencyName.text.trim(),
      'emergency_contact_phone': _emergencyPhone.text.trim(),
      'form_image_url': formImagePath,
      'status': 'submitted',
    };

    try {
      await supabase.from('yatra_registrations').insert(payload);
      setState(() {
        _message = 'Registration submitted.';
      });
    } on PostgrestException catch (e) {
      setState(() {
        _message = e.message;
      });
    } catch (e) {
      setState(() {
        _message = 'Could not submit: $e';
      });
    } finally {
      setState(() {
        _busy = false;
      });
    }
  }

  Future<void> _captureFormImage() async {
    try {
      final picked = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
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
    setState(() {
      _name.text = _name.text.isEmpty ? 'राम कुमार' : _name.text;
      _address.text = _address.text.isEmpty ? 'पुरी, ओडिशा' : _address.text;
      _phone.text = _phone.text.isEmpty ? '+919812345678' : _phone.text;
      _travelMode = 'train';
      _healthBp = true;
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
            colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.65), BlendMode.darken),
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
                        color: Colors.white.withOpacity(0.06),
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
                  DropdownButtonFormField<String>(
                    value: _travelMode,
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
                  SwitchListTile(
                    title: const Text('Health: BP', style: TextStyle(color: Colors.white)),
                    value: _healthBp,
                    activeColor: Colors.orangeAccent,
                    onChanged: (v) => setState(() => _healthBp = v),
                  ),
                  SwitchListTile(
                    title: const Text('Health: Diabetes', style: TextStyle(color: Colors.white)),
                    value: _healthDiabetes,
                    activeColor: Colors.orangeAccent,
                    onChanged: (v) => setState(() => _healthDiabetes = v),
                  ),
                  _buildTextField(
                    controller: _healthOther,
                    label: 'Other health notes',
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _emergencyName,
                    label: 'Emergency Contact Name',
                  ),
                  const SizedBox(height: 10),
                  _buildTextField(
                    controller: _emergencyPhone,
                    label: 'Emergency Contact Phone',
                    keyboard: TextInputType.phone,
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
        fillColor: Colors.white.withOpacity(0.08),
      );

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboard,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboard,
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
              value: _status,
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
        return Scaffold(
          appBar: AppBar(title: const Text('Registration Detail')),
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reg['name_hi'] ?? 'Unknown',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(reg['address_hi'] ?? ''),
                const SizedBox(height: 8),
                Text('Phone: ${reg['phone'] ?? ''}'),
                Text('WhatsApp: ${reg['whatsapp'] ?? ''}'),
                Text('Travel: ${reg['travel_mode'] ?? ''} (${reg['train_class'] ?? ''})'),
                Text('Health BP: ${reg['health_bp'] == true ? "Yes" : "No"}'),
                Text('Health Diabetes: ${reg['health_diabetes'] == true ? "Yes" : "No"}'),
                const SizedBox(height: 12),
                Row(
                  children: [
                    FilledButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Approve will call RPC later')),
                        );
                      },
                      child: const Text('Approve'),
                    ),
                    const SizedBox(width: 12),
                    OutlinedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Reject will call RPC later')),
                        );
                      },
                      child: const Text('Reject'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
