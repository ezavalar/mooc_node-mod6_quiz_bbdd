//Cargar el módulo Sequelize
const Sequelize= require("sequelize");
//Opciones para evitar los logs
const options={logging: false, operatosAliases: false};

//Generamos la instancia de Sequelize con el módulo sqlite y el nombre de la base de datos
const sequelize= new Sequelize("sqlite:quizzes.sqlite", options);

//Definimos la tabla quiz
sequelize.define("quiz",{
    question:{
        type: Sequelize.STRING,
        unique: {msg: "Ya existe esta pregunta"},
        validate: {notEmpty: {msg: "La pregunta no puede estar vacía"}} 
    },
    answer: {
        type: Sequelize.STRING,
        validate: {notEmpty: {msg: "La respuesta no puede estar vacía"}}
    }
});
//Sincronizamos los datos para verificar si existen mediante una serie de promesas y si existe guardamos los datos en la tabla
sequelize.sync()
.then(()=>sequelize.models.quiz.count())
.then(count=>{
    if(!count)
    {
        return sequelize.models.quiz.bulkCreate([
            {question: "Capital de Italia", answer: "Roma"},
            {question: "Capital de Francia", answer: "París"},
            {question: "Capital de España", answer: "Madrid"},
            {question: "Capital de Portugal", answer: "Lisboa"}
        ]);
    }
})
.catch(error=>{
    console.log(error);
});
module.exports= sequelize;