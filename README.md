# AgroSmart – Starter Integrasi Supabase

Starter ini adalah fondasi integrasi, bukan pengganti seluruh desain/prototipe AgroSmart sebelumnya.
Teknologi: HTML/CSS/JavaScript (ES modules) + Supabase JS v2 + API prakiraan cuaca BMKG.

## 1. Buat proyek Supabase
1. Buka https://supabase.com dan daftar / masuk.
2. Klik **New project**, pilih organisasi, isi nama `agrosmart`, buat password database yang kuat, lalu pilih region terdekat yang tersedia.
3. Tunggu proyek selesai dibuat.
4. Buka **Project Settings → API** (atau **Data API / API Keys** pada tampilan baru).
5. Salin **Project URL** dan **Publishable key**. Jika dashboard lama menampilkan `anon` key, key itu juga dapat digunakan.
6. Jangan pernah menyalin `secret` / `service_role` key ke file frontend.

## 2. Buat tabel database
1. Di dashboard Supabase, buka **SQL Editor → New query**.
2. Buka file `supabase/schema.sql` dari paket ini.
3. Salin seluruh isinya ke SQL Editor lalu klik **Run**.
4. Periksa menu **Table Editor**. Tabel `profiles`, `farm_records`, `disease_history`, `market_prices`, dan `articles` harus muncul.

SQL sudah mengaktifkan Row Level Security (RLS). Data milik pengguna hanya dapat dibaca/diubah pemiliknya. Harga pasar dan artikel dapat dibaca publik; penulisan tabel tersebut dibatasi untuk proses admin/backend.

## 3. Isi konfigurasi frontend
Buka `public/config.js`, ganti:
- `SUPABASE_URL` dengan Project URL.
- `SUPABASE_PUBLISHABLE_KEY` dengan Publishable key (atau anon key lama).

Publishable/anon key memang boleh berada di browser jika RLS aktif dan kebijakannya benar. Jangan masukkan password database, secret key, atau service_role key.

## 4. Jalankan website
Cara mudah:
1. Pasang Visual Studio Code.
2. Buka folder `agrosmart_starter`.
3. Pasang ekstensi **Live Server**.
4. Klik kanan `public/index.html` → **Open with Live Server**.

Alternatif: dari terminal pada folder proyek jalankan `python -m http.server 5500 --directory public`, lalu buka `http://localhost:5500`.

Jangan membuka file dengan `file://`; gunakan server lokal agar modul JavaScript berjalan normal.

## 5. Uji akun dan database
1. Pada halaman AgroSmart, isi email dan password lalu klik **Daftar**.
2. Jika konfirmasi email aktif, buka email dan klik tautan konfirmasi.
3. Masuk menggunakan akun tersebut.
4. Tambahkan catatan lahan/tanaman. Data akan tersimpan di tabel `farm_records`.
5. Cek **Table Editor → farm_records** di Supabase.

Jika pendaftaran berhasil tetapi belum bisa masuk, cek **Authentication → URL Configuration** dan tambahkan URL lokal, misalnya `http://localhost:5500`.

## 6. Aktifkan cuaca BMKG
Di panel cuaca, masukkan kode wilayah administrasi desa/kelurahan tingkat IV (adm4), lalu klik **Ambil prakiraan**.
Contoh format: `32.11.01.2001` (contoh format saja; pastikan kode sesuai desa/kelurahan tujuan).
BMKG menyediakan prakiraan 3 hari, 8 periode per hari, diperbarui 2 kali sehari, dan membatasi akses 60 permintaan/menit/IP. Tampilkan atribusi BMKG jika memakai datanya.

Dokumentasi: https://data.bmkg.go.id/prakiraan-cuaca/

## 7. Harga pasar: produsen dan eceran
Tabel `market_prices` sudah mendukung dua kategori:
- `produsen`: harga di tingkat petani/produsen.
- `eceran`: harga di tingkat konsumen/pasar.

Starter ini **tidak mengisi harga palsu** dan tidak menganggap halaman web sebagai API. Harga hanya muncul setelah data resmi dimasukkan melalui proses admin/import yang sah. Sumber yang dapat ditinjau:
- Panel Harga Pangan Kementerian Pertanian: https://app3.pertanian.go.id/panelharga/komoditas
- PIHPS Bank Indonesia: https://www.bi.go.id/Hargapangan/Home

Periksa izin, dokumentasi, format, dan ketersediaan API/unduhan sebelum membuat sinkronisasi otomatis. Jika belum ada API resmi yang dapat digunakan, admin dapat mengimpor CSV ke tabel `market_prices` melalui Table Editor. Jangan melakukan scraping yang melanggar ketentuan sumber.

Format CSV yang cocok untuk impor:
`commodity,price_type,price_per_kg,market_name,province,regency,observed_at,source_name,source_url`

Contoh nilai `price_type`: `produsen` atau `eceran`. Harga dalam Rupiah per kg. Gunakan tanggal ISO, misalnya `2026-11-03T08:00:00Z`.

## 8. Apa yang belum diaktifkan
- Diagnosa penyakit tanaman berbasis AI: belum dihubungkan ke model/API; jangan gunakan simulasi sebagai hasil diagnosis nyata.
- Notifikasi push, peta, dan unggah foto: perlu konfigurasi tambahan.
- Otomatisasi harga: menunggu API resmi/akses data yang diizinkan.
- Produksi: perlu domain HTTPS, kebijakan privasi, pengujian RLS, validasi, pembatasan request, dan backup.

## Troubleshooting
- `Invalid API key`: periksa Project URL dan Publishable/anon key.
- `relation does not exist`: jalankan ulang `schema.sql` dan periksa apakah query berhasil.
- `new row violates row-level security`: pastikan pengguna sudah login; periksa kebijakan RLS.
- `Email not confirmed`: konfirmasi email atau atur pengaturan Auth untuk kebutuhan pengembangan.
- Cuaca gagal: cek kode `adm4`, koneksi internet, dan status API BMKG.
