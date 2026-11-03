import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
const configured = !SUPABASE_URL.startsWith("GANTI_") && !SUPABASE_PUBLISHABLE_KEY.startsWith("GANTI_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
let currentUser = null;

function show(id, message, isError = false) {
  const el = $(id);
  el.textContent = message;
  el.style.color = isError ? "#b42318" : "";
}
function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
}
function requireConfig() {
  if (!supabase) throw new Error("Konfigurasi Supabase belum diisi. Edit public/config.js terlebih dahulu.");
}
async function updateSession() {
  if (!supabase) {
    $("session-label").textContent = "Konfigurasi Supabase belum diisi";
    show("auth-message", "Isi Project URL dan Publishable key di public/config.js.");
    return;
  }
  const {data:{session}} = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  $("session-label").textContent = currentUser ? `Masuk: ${currentUser.email}` : "Belum masuk";
  $("logout-btn").hidden = !currentUser;
  if (currentUser) await loadFarmRecords();
  else $("farm-list").textContent = "Masuk untuk melihat catatan lahan.";
}

$("signup-btn").addEventListener("click", async () => {
  try {
    requireConfig();
    const email = $("email").value.trim(), password = $("password").value;
    if (!email || password.length < 6) throw new Error("Isi email dan password minimal 6 karakter.");
    const {error} = await supabase.auth.signUp({email,password});
    if (error) {
  console.error("Detail error Si Linda:", error);
  $("price-result").textContent = JSON.stringify(error, null, 2);
  return;
}
    show("auth-message","Pendaftaran dikirim. Jika konfirmasi email aktif, buka email untuk verifikasi sebelum masuk.");
  } catch(e) { show("auth-message",e.message,true); }
});
$("login-btn").addEventListener("click", async () => {
  try {
    requireConfig();
    const {error} = await supabase.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
    if (error) throw error;
    show("auth-message","Berhasil masuk.");
    await updateSession();
  } catch(e) { show("auth-message",e.message,true); }
});
$("logout-btn").addEventListener("click", async () => {
  const {error} = await supabase.auth.signOut();
  if (error) show("auth-message",error.message,true);
  else { show("auth-message","Anda telah keluar."); await updateSession(); }
});

$("save-farm-btn").addEventListener("click", async () => {
  try {
    requireConfig();
    if (!currentUser) throw new Error("Silakan masuk terlebih dahulu.");
    const name = $("farm-name").value.trim(), plant = $("plant-name").value.trim();
    if (!name || !plant) throw new Error("Nama lahan dan komoditas wajib diisi.");
    const area = $("area").value ? Number($("area").value) : null;
    if (area !== null && (!Number.isFinite(area) || area < 0)) throw new Error("Luas lahan tidak valid.");
    const payload = {
      user_id: currentUser.id, farm_name:name, plant_name:plant,
      area_sqm:area, planting_date:$("planting-date").value || null,
      notes:$("farm-notes").value.trim() || null
    };
    const {error} = await supabase.from("farm_records").insert(payload);
    if (error) throw error;
    show("farm-message","Catatan berhasil disimpan.");
    ["farm-name","plant-name","area","planting-date","farm-notes"].forEach(id => $(id).value = "");
    await loadFarmRecords();
  } catch(e) { show("farm-message",e.message,true); }
});
$("refresh-farm-btn").addEventListener("click", loadFarmRecords);

async function loadFarmRecords() {
  if (!supabase || !currentUser) return;
  const {data,error} = await supabase.from("farm_records")
    .select("id,farm_name,plant_name,area_sqm,planting_date,notes,created_at")
    .order("created_at",{ascending:false}).limit(30);
  if (error) { $("farm-list").textContent = error.message; return; }
  if (!data?.length) { $("farm-list").textContent = "Belum ada catatan. Tambahkan catatan pertama Anda."; return; }
  $("farm-list").innerHTML = data.map(row => `
    <div class="farm-row">
      <strong>${escapeHtml(row.farm_name)} – ${escapeHtml(row.plant_name)}</strong>
      <div class="muted">${row.area_sqm ?? "—"} m² · Tanggal tanam: ${row.planting_date ?? "—"}</div>
      <div>${escapeHtml(row.notes ?? "")}</div>
    </div>`).join("");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

$("weather-btn").addEventListener("click", async () => {
  const adm4 = $("adm4").value.trim();
  if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(adm4)) {
    show("weather-result","Kode adm4 harus mengikuti format 00.00.00.0000.",true); return;
  }
  show("weather-result","Mengambil prakiraan BMKG…");
  try {
    const response = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`);
    if (!response.ok) throw new Error(`BMKG merespons HTTP ${response.status}`);
    const json = await response.json();
const entries = flattenBmkg(json);

if (!entries.length) {
  throw new Error("Data prakiraan tidak ditemukan. Periksa kode adm4.");
}

// Ambil informasi wilayah dari respons BMKG
const lokasi = json?.lokasi ?? {};

const namaDesa = lokasi.desa ?? "";
const namaKecamatan = lokasi.kecamatan ?? "";
const namaKota = lokasi.kotkab ?? "";
const namaProvinsi = lokasi.provinsi ?? "";

const namaWilayah = [
  namaDesa,
  namaKecamatan,
  namaKota,
  namaProvinsi
].filter(Boolean).join(", ");
    $("weather-result").innerHTML = `
  ${namaWilayah ? `<h3>${escapeHtml(namaWilayah)}</h3>` : ""}
  <ul>${entries.slice(0,8).map(item => {
      const date = item.local_datetime || item.utc_datetime || "Waktu tidak tersedia";
      return `<li><strong>${escapeHtml(date)}</strong> — ${escapeHtml(item.weather_desc ?? "—")}, ${item.t ?? "—"}°C, kelembapan ${item.hu ?? "—"}%</li>`;
    }).join("")}</ul><small>Sumber: BMKG. Prakiraan dapat berubah.</small>`;
  } catch(e) { show("weather-result",e.message,true); }
});
function flattenBmkg(json) {
  const out = [];
  // Format BMKG publik umumnya menyimpan prakiraan dalam data[].cuaca[][].
  for (const block of (json?.data ?? [])) {
    const cuaca = block?.cuaca;
    if (Array.isArray(cuaca)) {
      for (const group of cuaca) {
        if (Array.isArray(group)) out.push(...group);
        else if (group && typeof group === "object") out.push(group);
      }
    }
  }
  return out;
}




if (supabase) {
  supabase.auth.onAuthStateChange(() => { updateSession(); });
}
updateSession();
// ==================================
// GRAFIK RIWAYAT HARGA SI LINDA
// ==================================

let priceHistoryChart = null;

async function loadPriceHistory() {
  const result = $("price-history-result");
  const canvas = $("price-history-chart");

  try {
    requireConfig();

    const commodity = $("history-commodity").value;
    const period = $("history-period").value;

    result.textContent = "Memuat riwayat harga...";

    const { data, error } = await supabase
      .from("market_price_history")
      .select("commodity, price_per_kg, observed_at, period_type, source_name")
      .eq("commodity", commodity)
      .eq("period_type", period)
      .eq("region", "Jawa Barat")
      .order("observed_at", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      result.textContent = "Belum ada data untuk periode ini.";

      if (priceHistoryChart) {
        priceHistoryChart.destroy();
        priceHistoryChart = null;
      }

      return;
    }

    const labels = data.map(item => item.observed_at);
    const prices = data.map(item => Number(item.price_per_kg));

    if (priceHistoryChart) {
      priceHistoryChart.destroy();
    }

    priceHistoryChart = new Chart(canvas, {
      type: "line",

      data: {
        labels: labels,
        datasets: [{
          label: `Harga ${commodity} (per kg)`,
          data: prices,
          borderColor: "#16a34a",
          backgroundColor: "rgba(22, 163, 74, 0.15)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 4
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            display: true
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return rupiah(context.parsed.y);
              }
            }
          }
        },

        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return rupiah(value);
              }
            },
            title: {
              display: true,
              text: "Harga per kg"
            }
          },

          x: {
            title: {
              display: true,
              text: "Tanggal pengamatan"
            }
          }
        }
      }
    });

    result.textContent =
      `${commodity} — ${data.length} data riwayat (${period}). Sumber: ${data[0].source_name}.`;

  } catch (error) {
    result.textContent = error.message;
    console.error("Gagal memuat grafik:", error);
  }
}

$("history-commodity").addEventListener("change", loadPriceHistory);
$("history-period").addEventListener("change", loadPriceHistory);

loadPriceHistory();