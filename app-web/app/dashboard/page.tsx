import Header from "@/components/layout/Header";

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 h-full w-full bg-gray-50 dark:bg-black">
      <Header />
      <main className="flex-1 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome Admin!</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          This is your central hub. Use the sidebar to navigate to the detailed management sections such as 'Assets' or 'Users'.
        </p>
      </main>
    </div>
  );
}
