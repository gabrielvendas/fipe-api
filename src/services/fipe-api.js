const axios = require('axios');
const { HttpError } = require('../errors/index');

const verifyError = (data) => {
    if (data.codigo) {
        switch (data.codigo) {
            case '0':
                throw new HttpError('Veículo não encontrado', 404);
            case '2':
                throw new HttpError('Parâmetros inválidos', 400);
        }
    }
    return;
};

const requestReferenceTable = async () => {
    const { data } = await axios.post('http://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia');

    const response = data[0].Codigo.toString();

    return response;
};

const requestBrands = async (vehicleType) => {
    const body = {
        "codigoTabelaReferencia": await requestReferenceTable(),
        "codigoTipoVeiculo": vehicleType
    };

    const { data } = await axios.post('http://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas', body);
    verifyError(data);

    const response = data.map(item => {
        return {
            idMarca: item.Value,
            nomeMarca: item.Label,
            tipoVeiculo: vehicleType
        }
    });

    return response;
};

const requestModels = async (vehicleType, brandId) => {
    const body = {
        "codigoTabelaReferencia": await requestReferenceTable(),
        "codigoTipoVeiculo": vehicleType,
        "codigoMarca": brandId
    };

    const { data } = await axios.post('http://veiculos.fipe.org.br/api/veiculos/ConsultarModelos', body);
    verifyError(data);

    const response = data.Modelos.map(item => {
        return {
            idMarca: brandId,
            idModelo: item.Value.toString(),
            nomeModelo: item.Label,
            tipoVeiculo: vehicleType
        }
    });

    return response;
};

const requestModelYears = async (vehicleType, brandId, modelId) => {
    const body = {
        "codigoTabelaReferencia": await requestReferenceTable(),
        "codigoTipoVeiculo": vehicleType,
        "codigoMarca": brandId,
        "codigoModelo": modelId
    };

    const { data } = await axios.post('http://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo', body);
    verifyError(data);

    const response = data.map(item => {
        return {
            idMarca: brandId,
            idModelo: modelId,
            idAnoModelo: item.Value,
            nomeAnoModelo: item.Label,
            tipoVeiculo: vehicleType
        }
    });

    return response;
};

const requestValue = async (vehicleType, brandId, modelId, modelYearId) => {
    const body = {
        "codigoTabelaReferencia": await requestReferenceTable(),
        "codigoTipoVeiculo": vehicleType,
        "codigoMarca": brandId,
        "codigoModelo": modelId,
        "ano": modelYearId,
        "anoModelo": modelYearId.split('-')[0],
        "codigoTipoCombustivel": modelYearId.split('-')[1],
        "tipoConsulta": "tradicional"
    };

    const { data } = await axios.post('http://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros', body);
    verifyError(data);

    const response = {
        idMarca: brandId,
        nomeMarca: data.Marca,
        idModelo: modelId,
        nomeModelo: data.Modelo,
        idAnoModelo: modelYearId,
        ano: data.AnoModelo.toString(),
        combustivel: data.Combustivel,
        preco: data.Valor,
        codigoFipe: data.CodigoFipe,
        tipoVeiculo: vehicleType
    };

    return response;
};

const requestValueByFipeAndModelYear = async (fipeCode, modelYearId) => {
    let vehicleType, brand, model;
    let code = '0';

    for (let i = 1; i <= 3; i++) {
        const body = {
            "codigoTabelaReferencia": await requestReferenceTable(),
            "codigoTipoVeiculo": i,
            "anoModelo": modelYearId.split('-')[0],
            "modeloCodigoExterno": fipeCode,
            "codigoTipoCombustivel": modelYearId.split('-')[1],
            "tipoConsulta": "codigo"
        }

        const { data } = await axios.post('https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros', body);

        if (data.codigo && data.codigo === '2') code = '2';

        if (!data.codigo) {
            vehicleType = i.toString();
            brand = data.Marca;
            model = data.Modelo;
        }
    }

    if (!vehicleType) verifyError({ codigo: code });

    const brandId = await findBrandId(vehicleType, brand);
    const modelId = await findModelId(vehicleType, brandId, model);

    const response = await requestValue(vehicleType, brandId, modelId, modelYearId);

    return response;
};

const requestValueByFipe = async (fipeCode) => {
    let modelYearsIds = [];
    let code = '0';

    for (let i = 1; i <= 3; i++) {
        const body = {
            "codigoTabelaReferencia": 303,
            "codigoTipoVeiculo": i,
            "modeloCodigoExterno": fipeCode
        }

        const { data } = await axios.post('https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModeloPeloCodigoFipe', body);

        if (data.codigo && data.codigo === '2') code = '2';

        if (Array.isArray(data)) {
            for (const item of data) {
                modelYearsIds.push(item.Value);
            }
        }
    }

    if (modelYearsIds.length === 0) verifyError({ codigo: code });

    let response = [];

    for (const modelYearId of modelYearsIds) {
        response.push(await requestValueByFipeAndModelYear(fipeCode, modelYearId));
    }

    return response;
};

const findBrandId = async (vehicleType, brand) => {
    const brands = await requestBrands(vehicleType);
    const brandFound = brands.find(i => i.nomeMarca === brand);
    const brandId = brandFound.idMarca;
    return brandId;
};

const findModelId = async (vehicleType, brandId, model) => {
    const models = await requestModels(vehicleType, brandId);
    const modelFound = models.find(i => i.nomeModelo === model);
    const modelId = modelFound.idModelo;
    return modelId;
};

module.exports = { requestBrands, requestModels, requestModelYears, requestValue, requestValueByFipeAndModelYear, requestValueByFipe };