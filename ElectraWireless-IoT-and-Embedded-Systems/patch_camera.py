import re

path = "src/routes/camera.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the GLOBAL SCENE logic
content = re.sub(
    r"try \{\s*// Debounce the global scene prediction.*?catch\(e\) \{\}.*?if \(prediction\) \{.*?\}",
    "",
    content,
    flags=re.DOTALL
)

# 2. Fix dark mode class corruption
content = content.replace("dark:bg-white dark:bg-[#111116]", "dark:bg-[#111116]")
content = content.replace("dark:bg-[#181820]/80", "dark:bg-[#181820]/90")

# 3. Simplify person detection to avoid "hand detected as person"
# We will check if MobileNet thinks the crop is human-like.
# If coco-ssd says person, but MobileNet strongly says something completely different (like a hand/body part not person),
# MobileNet doesn't have "person" but it has "suit", etc. But it's better to just leave the label as what CocoSSD found, unless we have a face match!

def replace_person_logic(match):
    return """
                  if (det.class === "person") {
                    if (customFacesRef.current.length > 0) {
                      const activation = model.infer(cropCanvas, true);
                      const data = activation.dataSync() as Float32Array;
                      activation.dispose();

                      let bestMatch = null;
                      let highestSim = 0;

                      for (const face of customFacesRef.current) {
                        for (const emb of face.embeddings) {
                          let dotProduct = 0, normA = 0, normB = 0;
                          for (let i = 0; i < data.length; i++) {
                            dotProduct += data[i] * emb[i];
                            normA += data[i] * data[i];
                            normB += emb[i] * emb[i];
                          }
                          const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                          if (sim > highestSim) {
                            highestSim = sim;
                            bestMatch = face;
                          }
                        }
                      }

                      if (highestSim > 0.65 && bestMatch) {
                        label = `${bestMatch.name} (${Math.round(highestSim * 100)}%)`;
                      } else {
                        // Just label as person instead of unknown person to avoid confusion when it's a hand
                        label = "Person";
                      }
                    } else {
                      label = "Person";
                    }
                  } else {
                    // Not a person, just use the CocoSSD label directly to avoid MobileNet hallucinating on tiny crops
                    label = det.class.charAt(0).toUpperCase() + det.class.slice(1);
                  }
"""

content = re.sub(
    r"if \(\(det\.class === \"person\" \|\| isHumanClothing\)\) \{.*?} else \{[^{}]*// It's an object! Use MobileNet.*?\}",
    replace_person_logic,
    content,
    flags=re.DOTALL
)

# Replace the specific block if the regex failed:
person_block = """
                  if (det.class === "person" || isHumanClothing) {
                    if (customFacesRef.current.length > 0) {
                      const activation = model.infer(cropCanvas, true);
                      const data = activation.dataSync() as Float32Array;
                      activation.dispose();

                      let bestMatch = null;
                      let highestSim = 0;

                      for (const face of customFacesRef.current) {
                        for (const emb of face.embeddings) {
                          let dotProduct = 0, normA = 0, normB = 0;
                          for (let i = 0; i < data.length; i++) {
                            dotProduct += data[i] * emb[i];
                            normA += data[i] * data[i];
                            normB += emb[i] * emb[i];
                          }
                          const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                          if (sim > highestSim) {
                            highestSim = sim;
                            bestMatch = face;
                          }
                        }
                      }

                      // Lowered threshold to 0.55 to prevent Unknown Person error
                      if (highestSim > 0.55 && bestMatch) {
                        label = `${bestMatch.name} #Elly ID: #${bestMatch.id} (${Math.round(highestSim * 100)}%)`;
                      } else {
                        label = `Unknown Person (${Math.round(highestSim * 100)}%)`;
                      }
                    } else {
                      label = "Unknown Person";
                    }
                  } else {
                    // It's an object! Use MobileNet's 1000-class label
                    label = mobileNetClass.charAt(0).toUpperCase() + mobileNetClass.slice(1);
                  }
"""
content = content.replace(person_block, replace_person_logic(None))


with open(path, "w", encoding="utf-8") as f:
    f.write(content)
