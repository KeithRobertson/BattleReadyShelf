export default {
    "input": "../backend/src/main/resources/openapi/openapi.yaml",
    "output": "src/generated",
    plugins: [
        {
            name: '@hey-api/client-axios',
            runtimeConfigPath: './src/api/client.ts'
        }
    ]
}