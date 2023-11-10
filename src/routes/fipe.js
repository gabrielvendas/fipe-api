const express = require('express');
const router = express();

const { fipeControllers } = require('../controllers/index');

router.get('/fipe/:fipeCode', fipeControllers.getVehicleValueByFipe);
router.get('/fipe/:fipeCode/:modelYearId', fipeControllers.getVehicleValueByFipeAndModelYear);

module.exports = router;