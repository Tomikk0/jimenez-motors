// === STATISZTIKA FUNKCIÓK ===
async function loadStats() {
  try {
    // ÖSSZES AUTÓ BETÖLTÉSE (eladott és nem eladott együtt)
    const { data: allCarsData, error } = await supabase
      .from('cars')
      .select('*')
      .eq('is_gallery', false)  // Csak a kereskedelmi autók, nem a galéria
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allCars = allCarsData || [];
    
    // SZÁMOLÁSOK
    const totalCars = allCars.length;
    const soldCars = allCars.filter(car => car.sold).length;
    const availableCars = totalCars - soldCars;
    
    // ÖSSZES PROFIT számolása CSAK az eladott autókból
    let totalProfit = 0;
    allCars.forEach(car => {
      if (car.sold && car.purchase_price && car.sale_price) {
        const profit = car.sale_price - car.purchase_price;
        totalProfit += profit;
      }
    });
    
    // LEGNÉPSZERŰBB MODELL számolása az ÖSSZES autóból
    const modelCount = {};
    allCars.forEach(car => {
      if (car.model) {
        modelCount[car.model] = (modelCount[car.model] || 0) + 1;
      }
    });
    
    let popularModel = '-';
    let maxCount = 0;
    for (const model in modelCount) {
      if (modelCount[model] > maxCount) {
        maxCount = modelCount[model];
        popularModel = model;
      }
    }
    
    // TAGOK SZÁMA
    const totalTags = tagOptions.length;

    // FRISSÍTÉS A HTML-BEN
    document.getElementById('totalCars').textContent = totalCars;
    document.getElementById('soldCars').textContent = soldCars;
    document.getElementById('totalTags').textContent = totalTags;
    
    const formattedProfit = new Intl.NumberFormat('hu-HU').format(totalProfit);
    document.getElementById('totalProfit').textContent = formattedProfit + ' $';
    document.getElementById('popularModel').textContent = popularModel;
    
    console.log('📊 Statisztika frissítve:', {
      totalCars,
      soldCars,
      availableCars,
      totalProfit,
      popularModel,
      totalTags
    });
    
  } catch (error) {
    console.error('loadStats hiba:', error);
    showMessage('Hiba történt a statisztika betöltésekor', 'error');
  }
}