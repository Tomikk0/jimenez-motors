// === STATISZTIKA FUNKCIÓK ===
function loadStats() {
  try {
    const totalCars = allCars.length;
    const soldCars = allCars.filter(car => car.Eladva).length;
    
    document.getElementById('totalCars').textContent = totalCars;
    document.getElementById('soldCars').textContent = soldCars;
    document.getElementById('totalTags').textContent = tagOptions.length;
    
    let totalProfit = 0;
    allCars.forEach(car => {
      if (car.Eladva) {
        const vetel = parseFloat(car.VetelAr) || 0;
        const eladas = parseFloat(car.EladasiAr) || 0;
        if (vetel > 0 && eladas > 0) {
          totalProfit += (eladas - vetel);
        }
      }
    });
    
    const formattedProfit = new Intl.NumberFormat('hu-HU').format(totalProfit);
    document.getElementById('totalProfit').textContent = formattedProfit + ' $';
    
    const modelCount = {};
    allCars.forEach(car => {
      if (car.Model) {
        modelCount[car.Model] = (modelCount[car.Model] || 0) + 1;
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
    document.getElementById('popularModel').textContent = popularModel;
  } catch (error) {
    console.error('loadStats hiba:', error);
  }
}