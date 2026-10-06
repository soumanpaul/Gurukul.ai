# pip install laya
from laya import Router

router = Router()  # downloads convaiinnovations/laya first time

state = {
  "subject": "DBMS doubt",
  "body": "What is 3rd Normal Form? Explain in Bengali, urgent exam tomorrow"
}

questions = {
  "topic": {
    "type": "choice",
    "instructions": "Which BCA subject is this?",
    "criteria": {
      "dbms": "databases, SQL, normalization",
      "dsa": "algorithms, arrays, trees",
      "os": "operating system, processes",
      "other": "everything else"
    }
  },
  "urgency": {
    "type": "score",
    "instructions": "How urgent is it?",
    "criteria": ["routine", "soon", "blocking"]
  },
  "needs_bengali": {
    "type": "noul", # yes/no
    "instructions": "Does user want Bengali answer?"
  }
}

result = router.predict(state, questions)
print(result["answers"])
# -> { topic: dbms 98%, urgency: blocking 92%, needs_bengali: true 99% }
# Tagline: "Har school ka apna AI Gurukul"
# gurukulai.org