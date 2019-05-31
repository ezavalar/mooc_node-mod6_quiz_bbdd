const Sequelize= require("sequelize");

const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model');


/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = rl => {
    log("Commandos:");
    log("  h|help - Muestra esta ayuda.");
    log("  list - Listar los quizzes existentes.");
    log("  show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log("  add - Añadir un nuevo quiz interactivamente.");
    log("  delete <id> - Borrar el quiz indicado.");
    log("  edit <id> - Editar el quiz indicado.");
    log("  test <id> - Probar el quiz indicado.");
    log("  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("  credits - Créditos.");
    log("  q|quit - Salir del programa.");
    rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {

    models.quiz.findAll()
    .each(quiz=>{ //Promesa que toma el array e inmediatamente titera sobre él
            log(` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
    })
    .catch(error=>{
        errorlog(error.message);
    })
    .then(()=>{
            rl.prompt();
    });
};


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */

//Promesa para validar el id
const validateId= id=>{
    return new Sequelize.Promise((resolve, reject)=>{
        if(typeof id==="undefined")
            reject(new Error("Falta el parámetro <id>."));
        else
        {
            id= parseInt(id); //Convertimos a entero
            if(Number.isNaN(id))
                reject(new Error("El parámetro <id> no es número."));
            else
                resolve(id);
        }
    });
};
exports.showCmd = (rl, id) => {
    validateId(id)
    .then(id=>models.quiz.findByPk(id)) //findById esta depreciado, se usa findByPk
    .then(quiz=>{
        if(!quiz)
            throw new Error("No existe un quiz asociado al id="+id);
        log(` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(error=>{
        errorlog(error.message);
    })
    .then(()=>{
        rl.prompt();
    });
};


/**
 * Añade un nuevo quiz al módelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
//Promesa para hacer la pregunta
const makeQuestion=(rl,text)=>{
    return new Sequelize.Promise((resolve, reject)=>{
        rl.question(colorize(text,"red"), answer=>{
            resolve(answer.trim());
        });
    });
};
exports.addCmd = rl => {
    makeQuestion(rl, "Introduzca una pregunta: ")
    .then(q=>{
        return makeQuestion(rl, "Introduzca la respuesta: ")
        .then(a=>{
            return {question: q, answer: a};
        });
    })
    .then(quiz=>{
        return models.quiz.create(quiz);
    })
    .then(quiz=>{
        log(` [${colorize("Se ha añadido", 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error=>{
        errorlog("El quiz es erroneo: ");
        error.errors.forEach(({message})=>errorlog(message));
    })
    .catch(error=>{
        errorlog(error.message);
    })
    .then(()=>{
        rl.prompt();
    });
};


/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
    validateId(id)
    .then(id=>models.quiz.destroy({where: {id}}))
    .catch(error=>{
        errorlog(error.message);
    })
    .then(()=>{
        rl.prompt();
    });
};


/**
 * Edita un quiz del modelo.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
    validateId(id)
    .then(id=>models.quiz.findByPk(id))
    .then(quiz=>{
        if(!quiz)
            throw new Error("No existe un quiz asociado al id="+id);

        process.stdout.isTTY && setTimeout(()=>{rl.write(quiz.question)},0);
        return makeQuestion(rl, "Introduzca la pregunta: ")
        .then(q=>{
            process.stdout.isTTY && setTimeout(()=>{rl.write(quiz.answer)},0);
            return makeQuestion(rl, "Introduzca la respuesta: ")
            .then(a=>{
                quiz.question=q;
                quiz.answer=a;
                return quiz;
            });
        });
    })
    .then(quiz=>{
        return quiz.save();
    })
    .then(quiz=>{
        log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error=>{
        errorlog("El quiz es erroneo: ");
        error.errors.forEach(({message})=>errorlog(message));
    })
    .catch(error=>{
        errorlog(error.message);
    })
    .then(()=>{
        rl.prompt();
    });
};


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {
   // log('Probar el quiz indicado.', 'red');
    if(typeof id === "undefined")
    {
        errorlog("Falta el parámetro id.");
        rl.prompt();
    }
    else
    {
        try
        {
            const quiz = model.getByIndex(id);
            rl.question(quiz.question+": ", resp=>{
                if(resp===quiz.answer)
                    biglog('Correcto :)', 'green');
                else
                    biglog('Incorrecto :(', 'red'); 
            });
        }
        catch(error) {
            errorlog(error.message);

        }
        finally
        {
            rl.prompt();
        }
    }
};


/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.playCmd = rl => {
    let score=0;
    const numquizzes=model.count();
    let toBeResolved=[];//Indice de preguntas sin resolver
    //For para introducir los ID's existentes

    
    for (var i=0; i<numquizzes; i++) 
    {
       toBeResolved[i]=i;
    }
    const playOne=()=>
    {
      if(toBeResolved.length===0)
      {
           log('No hay mas preguntas que resolver.', 'blue');
           log("Aciertos: ",'green');
           biglog(score, 'green');
      }
      else
      {

           let id=Math.floor(Math.random()*toBeResolved.length);
           let quiz=model.getByIndex(toBeResolved[id]);

           rl.question(quiz.question+": ", resp=>{
               if(resp===quiz.answer)
               {
                    log('Correcto :)', 'green');
                    score++;
                    log("Aciertos: ",'green');
                    biglog(score, 'green');
                    playOne();
               }
               else
               {
                    log('Incorrecto :(', 'red'); 
                    log('Fin del examen.', 'blue');
                    log("Aciertos: ",'green');
                    biglog(score, 'green');
               }
           });
           toBeResolved.splice(id,1);
        }
        rl.prompt();
    }
    playOne();
};


/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = rl => {
    log('Autores de la práctica:');
    log('Ericka Zavala', 'green');
    rl.prompt();
};


/**
 * Terminar el programa.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = rl => {
    rl.close();
};

