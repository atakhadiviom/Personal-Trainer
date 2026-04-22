export const calculateNutrition = (formData) => {
  const weight = parseInt(formData.weight) || 75;
  const isLoss = formData.goal === 'fatloss';

  const dailyCals = isLoss ? weight * 22 : weight * 30;

  return {
    targetCals: dailyCals,
    targetPro: Math.round(weight * 2),
    targetCarbs: Math.round((dailyCals * 0.4) / 4),
    targetFat: Math.round((dailyCals * 0.25) / 9)
  };
};
