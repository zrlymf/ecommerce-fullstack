// Daftar Kota dan Pulaunya 
const CITY_ZONES: Record<string, string> = {
  // --- JAWA ---
  'Jakarta': 'JAWA',
  'Bandung': 'JAWA',
  'Semarang': 'JAWA',
  'Yogyakarta': 'JAWA',
  'Surabaya': 'JAWA',
  'Malang': 'JAWA',
  'Sidoarjo': 'JAWA',
  'Gresik': 'JAWA',
  'Banyuwangi': 'JAWA',
  'Solo': 'JAWA',
  'Surakarta': 'JAWA',
  'Bogor': 'JAWA',
  'Depok': 'JAWA',
  'Tangerang': 'JAWA',
  'Bekasi': 'JAWA',
  'Banten': 'JAWA',
  'Serang': 'JAWA',
  'Cirebon': 'JAWA',
  'Tegal': 'JAWA',
  'Pekalongan': 'JAWA',
  'Magelang': 'JAWA',
  'Madiun': 'JAWA',
  'Kediri': 'JAWA',
  'Jember': 'JAWA',
  'Pasuruan': 'JAWA',
  'Probolinggo': 'JAWA',

  // --- SUMATERA ---
  'Medan': 'SUMATERA',
  'Palembang': 'SUMATERA',
  'Padang': 'SUMATERA',
  'Lampung': 'SUMATERA',
  'Bandar Lampung': 'SUMATERA',
  'Pekanbaru': 'SUMATERA',
  'Banda Aceh': 'SUMATERA',
  'Jambi': 'SUMATERA',
  'Bengkulu': 'SUMATERA',
  'Batam': 'SUMATERA',
  'Pangkal Pinang': 'SUMATERA',
  'Tanjung Pinang': 'SUMATERA',
  'Dumai': 'SUMATERA',
  'Binjai': 'SUMATERA',
  'Pematang Siantar': 'SUMATERA',

  // --- KALIMANTAN ---
  'Pontianak': 'KALIMANTAN',
  'Samarinda': 'KALIMANTAN',
  'Balikpapan': 'KALIMANTAN',
  'Banjarmasin': 'KALIMANTAN',
  'Palangkaraya': 'KALIMANTAN',
  'Tarakan': 'KALIMANTAN',
  'Banjarbaru': 'KALIMANTAN',
  'Singkawang': 'KALIMANTAN',
  'Bontang': 'KALIMANTAN',

  // --- SULAWESI ---
  'Makassar': 'SULAWESI',
  'Manado': 'SULAWESI',
  'Palu': 'SULAWESI',
  'Kendari': 'SULAWESI',
  'Gorontalo': 'SULAWESI',
  'Mamuju': 'SULAWESI',
  'Bitung': 'SULAWESI',
  'Palopo': 'SULAWESI',
  'Parepare': 'SULAWESI',

  // --- BALI & NUSA TENGGARA ---
  'Denpasar': 'BALI',
  'Badung': 'BALI',
  'Gianyar': 'BALI',
  'Mataram': 'NUSA_TENGGARA',
  'Kupang': 'NUSA_TENGGARA',
  'Bima': 'NUSA_TENGGARA',
  'Labuan Bajo': 'NUSA_TENGGARA',

  // --- MALUKU & PAPUA ---
  'Ambon': 'MALUKU',
  'Ternate': 'MALUKU',
  'Jayapura': 'PAPUA',
  'Sorong': 'PAPUA',
  'Manokwari': 'PAPUA',
  'Merauke': 'PAPUA',
  'Timika': 'PAPUA',
};

// Fungsi deteksi zona
export const getZoneFromAddress = (address: string): string => {
  if (!address) return 'UNKNOWN';
  const lowerAddr = address.toLowerCase();
  
  for (const city in CITY_ZONES) {
    if (lowerAddr.includes(city.toLowerCase())) {
      return CITY_ZONES[city];
    }
  }
  return 'UNKNOWN';
};

// Fungsi Hitung Ongkir (Logika Zonasi)
export const calculateRate = (sellerAddr: string, buyerCity: string): number => {
  const sellerZone = getZoneFromAddress(sellerAddr);
  const buyerZone = getZoneFromAddress(buyerCity);

  // 1. Jika Gagal Deteksi (Kota Pelosok)
  if (sellerZone === 'UNKNOWN' || buyerZone === 'UNKNOWN') return 55000;

  // 2. Jika SATU PULAU 
  if (sellerZone === buyerZone) return 20000;

  // 3. Jika Tetangga Dekat 
  const neighbors = [
    ['JAWA', 'BALI'],
    ['JAWA', 'SUMATERA'],
    ['JAWA', 'KALIMANTAN'] 
  ];

  const isNeighbor = neighbors.some(([z1, z2]) => 
    (sellerZone === z1 && buyerZone === z2) || (sellerZone === z2 && buyerZone === z1)
  );

  if (isNeighbor) return 35000;

  // 4. Jika BEDA PULAU JAUH 
  return 65000;
};