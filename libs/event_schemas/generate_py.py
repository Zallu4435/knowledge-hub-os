import sys
from datamodel_code_generator.__main__ import main

if __name__ == "__main__":
    # We intercept Bazel's arguments and format them for the generator
    sys.argv = [
        "datamodel-codegen",
        "--input", sys.argv[1],
        "--input-file-type", "jsonschema",
        "--output", sys.argv[2],
        "--output-model-type", "pydantic_v2.BaseModel"
    ]
    sys.exit(main())
